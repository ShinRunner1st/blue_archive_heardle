/**
 * Multiplayer rooms: one Durable Object per room, reached over a WebSocket
 * at /room/<code>. The game itself is src/helpers/room.ts; this file only
 * connects it to Cloudflare: the sockets, the object's storage and its alarm.
 *
 * Kept inside the free plan's daily limits (see the README's Multiplayer
 * rooms):
 * - The object hibernates between messages, so it's only billed while it
 *   handles one, and the keep-alive is answered without waking it.
 * - The room's live part and each player's ride on the sockets (their
 *   attachments), which costs nothing; storage holds only a game, written
 *   when it starts and once a round. A lobby writes nothing.
 * - Its clocks are the pages' ticks, not alarms, which are each a write;
 *   the one alarm tidies up after a game. A lobby left idle closes on a
 *   tick too.
 * - A page sends a hello, then a few short messages a round; everything
 *   the room sends is free.
 * - Rooms made and connections opened are counted per address a minute,
 *   before any room wakes, so nobody can spend the day's allowance.
 */
import { DurableObject } from "cloudflare:workers";

import {
  countMessage,
  Flood,
  Live,
  parseMessage,
  PlayerRecord,
  Room,
  Saved,
} from "../src/helpers/room";
import { isRoomCode, RoomError, ServerMessage } from "../src/types/room";

interface Env {
  ROOMS: DurableObjectNamespace<GameRoom>;
  /** Rooms made, and connections opened, per address a minute. */
  MAKE_LIMIT?: RateLimit;
  JOIN_LIMIT?: RateLimit;
}

/**
 * The pages allowed to open a room: the site, its test address, its preview
 * (site-worker/wrangler.preview.jsonc), and a local dev server. A browser
 * always says which page it's on, so another site can't run its own game on
 * these rooms.
 */
function isAllowedOrigin(origin: string | null): boolean {
  return (
    origin === "https://baheardle.com" ||
    origin === "https://ba-heardle-site.shinrunner1st.workers.dev" ||
    origin === "https://ba-heardle-site-preview.shinrunner1st.workers.dev" ||
    (origin !== null && /^http:\/\/localhost:\d+$/.test(origin))
  );
}

/**
 * The key a connection is counted under: a hash of its address, so the
 * address itself isn't handed on even to the counter, which forgets it
 * within the minute.
 */
async function counterKey(request: Request): Promise<string> {
  const address = request.headers.get("CF-Connecting-IP") ?? "local";
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`ba-heardle-rooms/${address}`)
  );
  return Array.from(new Uint8Array(digest).slice(0, 12), (b) =>
    b.toString(16).padStart(2, "0")
  ).join("");
}

async function allowed(
  limit: RateLimit | undefined,
  key: string
): Promise<boolean> {
  if (!limit) return true;
  try {
    return (await limit.limit({ key })).success;
  } catch {
    // The counter itself failing shouldn't close the rooms.
    return true;
  }
}

/** Turns a page away from the Worker itself, without waking a room. */
function turnAway(code: RoomError): Response {
  const [client, server] = Object.values(new WebSocketPair());
  server.accept();
  send(server, { t: "error", code });
  closeQuietly(server, 4000, code);
  return new Response(null, { status: 101, webSocket: client });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const code = url.pathname.match(/^\/room\/(\w+)$/)?.[1];
    // Checked before a room is woken: a bad address costs no Durable Object
    // request.
    if (!code || !isRoomCode(code)) {
      return new Response("Not found", { status: 404 });
    }
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("A room is reached over a WebSocket", {
        status: 426,
      });
    }
    if (!isAllowedOrigin(request.headers.get("Origin"))) {
      return new Response("Forbidden", { status: 403 });
    }
    const key = await counterKey(request);
    const make = url.searchParams.get("make") === "1";
    if (
      !(await allowed(env.JOIN_LIMIT, key)) ||
      (make && !(await allowed(env.MAKE_LIMIT, key)))
    ) {
      return turnAway("slow");
    }
    return env.ROOMS.getByName(code).fetch(request);
  },
};

/**
 * What rides on each socket: its room; whether it was counted as making
 * one; its own count of messages, for the flood limit; and once its player
 * has said hello, the player and the room's live part.
 */
interface Attachment {
  code: string;
  make: boolean;
  flood?: Flood;
  player?: PlayerRecord;
  live?: Live;
}

/** The page's keep-alive, answered without waking the room. */
const PING = "ping";

export class GameRoom extends DurableObject<Env> {
  /** Storage's copy of the game, read once each time the room wakes. */
  private saved: Saved | null = null;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.setWebSocketAutoResponse(
      new WebSocketRequestResponsePair(PING, "pong")
    );
    // Once each time the room wakes, before any message is handled.
    void ctx.blockConcurrencyWhile(async () => {
      this.saved = (await ctx.storage.get<Saved>("room")) ?? null;
    });
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const code = url.pathname.split("/").pop() ?? "";
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({
      code,
      make: url.searchParams.get("make") === "1",
    } satisfies Attachment);
    return new Response(null, { status: 101, webSocket: client });
  }

  /**
   * The room as it is now: its live part from the sockets (the newest
   * copy), or, with nobody connected since a restart, from storage.
   */
  private load(from: string, now: number, leaving?: WebSocket) {
    let code = from;
    const sockets = new Map<string, WebSocket>();
    const players: PlayerRecord[] = [];
    let live: Live | null = null;
    for (const ws of this.ctx.getWebSockets()) {
      if (ws === leaving) continue;
      const attachment = ws.deserializeAttachment() as Attachment | null;
      if (!attachment?.player) continue;
      // The alarm comes with no socket of its own to say the room's code.
      code ||= attachment.code;
      players.push(attachment.player);
      sockets.set(attachment.player.token, ws);
      if (attachment.live && (!live || attachment.live.stamp > live.stamp)) {
        live = attachment.live;
      }
    }
    if (this.saved && (!live || this.saved.live.stamp > live.stamp)) {
      const room = live
        ? new Room(code, this.saved.live, this.saved.game, players)
        : Room.resume(code, this.saved, now);
      return { room, sockets };
    }
    const game = live && this.saved ? this.saved.game : null;
    return { room: new Room(code, live, game, players), sockets };
  }

  /** Stores what changed, sets the alarm, and sends everyone their view. */
  private async commit(room: Room, sockets: Map<string, WebSocket>) {
    const now = Date.now();
    if (room.closing) {
      // Everyone out, told why; a lobby has nothing stored, but a record
      // left from a game goes too.
      for (const ws of this.ctx.getWebSockets()) refuse(ws, room.closing);
      if (this.saved) {
        this.saved = null;
        await this.ctx.storage.deleteAll().catch(() => undefined);
        await this.ctx.storage.deleteAlarm().catch(() => undefined);
      }
      return;
    }
    if (room.live) room.live = { ...room.live, stamp: room.live.stamp + 1 };
    for (const player of room.players) {
      const ws = sockets.get(player.token);
      // Each socket keeps its own flood count.
      const { flood } = (ws?.deserializeAttachment() ?? {}) as Attachment;
      ws?.serializeAttachment({
        code: room.code,
        make: false,
        ...(flood ? { flood } : {}),
        player,
        ...(room.live ? { live: room.live } : {}),
      } satisfies Attachment);
    }
    try {
      if (room.wipe && this.saved) {
        this.saved = null;
        await this.ctx.storage.deleteAll();
        await this.ctx.storage.deleteAlarm();
      }
      const saved = room.save ? room.saved() : null;
      if (saved) {
        this.saved = saved;
        await this.ctx.storage.put("room", saved);
      }
      if (room.alarmAt !== null) await this.ctx.storage.setAlarm(room.alarmAt);
    } catch {
      // The free plan's writes have run out for the day: the room can't
      // go on, so everyone is told the rooms are resting until tomorrow.
      for (const ws of this.ctx.getWebSockets()) refuse(ws, "resting");
      this.saved = null;
      await this.ctx.storage.deleteAll().catch(() => undefined);
      return;
    }
    if (!room.live) return;
    for (const player of room.players) {
      send(sockets.get(player.token), {
        t: "room",
        view: room.viewFor(player, now),
      });
    }
  }

  async webSocketMessage(ws: WebSocket, text: string | ArrayBuffer) {
    // A socket already turned away has nothing left to say.
    const kept = ws.deserializeAttachment() as Attachment | null;
    if (!kept) return;
    // Counted on this socket's own attachment, which outlives the room
    // sleeping between messages, and belongs to this connection alone.
    const { over, ...flood } = countMessage(kept.flood, Date.now());
    const attachment: Attachment = { ...kept, flood };
    ws.serializeAttachment(attachment);
    if (over) {
      // Out of the room first: refusing forgets whose connection it was.
      await this.left(ws);
      refuse(ws, "slow");
      return;
    }
    const message = parseMessage(text);
    if (!message) return;
    const now = Date.now();
    const { room, sockets } = this.load(attachment.code, now);

    if (message.t === "hello") {
      if (attachment.player) return;
      const result = room.hello(message, now, attachment.make);
      if ("error" in result) {
        refuse(ws, result.error);
        return;
      }
      if (result.replaced) {
        // The same player on a new connection: the old one is let go.
        const old = sockets.get(result.replaced.token);
        if (old && old !== ws) {
          old.serializeAttachment({
            code: room.code,
            make: false,
          } satisfies Attachment);
          closeQuietly(old, 4001, "replaced");
        }
      }
      sockets.set(result.player.token, ws);
    } else {
      const player = room.players.find(
        (p) => p.token === attachment.player?.token
      );
      if (!player) return;
      room.message(player, message, now);
      // Taken out by the host: told why, and closed.
      for (const token of room.kicks) {
        const kicked = sockets.get(token);
        if (kicked) refuse(kicked, "kicked");
      }
    }
    await this.commit(room, sockets);
  }

  async webSocketClose(ws: WebSocket, code: number) {
    await this.left(ws);
    // 1005 and 1006 only describe a close; they can't be sent back.
    closeQuietly(ws, code === 1000 || code >= 3000 ? code : 1000, "");
  }

  async webSocketError(ws: WebSocket) {
    await this.left(ws);
  }

  private async left(ws: WebSocket) {
    const attachment = ws.deserializeAttachment() as Attachment | null;
    if (!attachment?.player) return;
    const player = attachment.player;
    ws.serializeAttachment({
      code: attachment.code,
      make: false,
    } satisfies Attachment);
    const { room, sockets } = this.load(attachment.code, Date.now(), ws);
    room.leave(player, Date.now());
    await this.commit(room, sockets);
  }

  async alarm() {
    const now = Date.now();
    const { room, sockets } = this.load("", now);
    if (room.alarm(now) === "close") {
      this.saved = null;
      await this.ctx.storage.deleteAll();
      return;
    }
    await this.commit(room, sockets);
  }
}

function send(ws: WebSocket | undefined, message: ServerMessage) {
  try {
    ws?.send(JSON.stringify(message));
  } catch {
    // Already closing: its close event tidies up.
  }
}

/** Tells the page why, then closes; the page shows the reason. */
function refuse(ws: WebSocket, code: RoomError) {
  send(ws, { t: "error", code });
  ws.serializeAttachment(null);
  closeQuietly(ws, 4000, code);
}

function closeQuietly(ws: WebSocket, code: number, reason: string) {
  try {
    ws.close(code, reason);
  } catch {
    // Closed already.
  }
}
