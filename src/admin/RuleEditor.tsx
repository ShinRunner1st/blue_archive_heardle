/**
 * A mission's rule, edited: what it does with the rounds (count them, the
 * different answers, days, a streak, a run), which rounds (games, ways to
 * play, server, picture or silhouette) and which of those count (won or
 * played, tries, clip, clock), with the ways to play it covers in words.
 */
import {
  type MissionRule,
  RULE_COUNTS,
  RULE_GAMES,
  RULE_MODES,
  type RuleCount,
  type RuleGame,
  type RuleMode,
} from "../constants/missions";
import { SERVER_NAMES, SERVERS, type Server } from "../types/server";
import { waysLine } from "./ruleText";
import { Check, Field, Hint, Input, Note, Row, Select } from "./ui";

const GAMES = Object.keys(RULE_GAMES) as RuleGame[];
const MODES = Object.keys(RULE_MODES) as RuleMode[];
const COUNTS = Object.keys(RULE_COUNTS) as RuleCount[];

/** The rule with every field left as "any" taken out, as the file keeps it. */
function tidy(rule: MissionRule): MissionRule {
  const next = { ...rule } as Record<string, unknown>;
  for (const [field, value] of Object.entries(next)) {
    if (value === undefined || (Array.isArray(value) && value.length === 0)) {
      delete next[field];
    }
  }
  if (next.result === "won") delete next.result;
  return next as unknown as MissionRule;
}

/** A whole number from a box, or nothing for an empty one. */
const numberOf = (text: string) =>
  text.trim() === "" ? undefined : Math.max(0, Math.floor(Number(text)));

function Ticks<T extends string>({
  name,
  all,
  labels,
  picked = [],
  onChange,
}: {
  name: string;
  all: T[];
  labels: Record<T, string>;
  picked?: T[];
  onChange: (picked: T[]) => void;
}) {
  return (
    <Row style={{ gap: "4px 14px" }}>
      {all.map((item) => (
        <Check key={item} style={{ marginBottom: 0, fontWeight: 600 }}>
          <input
            type="checkbox"
            name={`${name}-${item}`}
            checked={picked.includes(item)}
            onChange={(event) =>
              onChange(
                event.target.checked
                  ? all.filter(
                      (other) => other === item || picked.includes(other)
                    )
                  : picked.filter((other) => other !== item)
              )
            }
          />
          {labels[item]}
        </Check>
      ))}
    </Row>
  );
}

export function RuleEditor({
  rule,
  onChange,
}: {
  rule: MissionRule;
  onChange: (rule: MissionRule) => void;
}) {
  const set = (patch: Partial<MissionRule>) =>
    onChange(tidy({ ...rule, ...patch }));
  const ways = waysLine(rule);

  return (
    <>
      <Field label="Count">
        <Select
          name="rule-count"
          value={rule.count}
          onChange={(event) => set({ count: event.target.value as RuleCount })}
        >
          {COUNTS.map((count) => (
            <option key={count} value={count}>
              {RULE_COUNTS[count]}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Games" hint="None ticked: every game.">
        <Ticks
          name="rule-game"
          all={GAMES}
          labels={RULE_GAMES}
          picked={rule.games}
          onChange={(games) => set({ games })}
        />
      </Field>
      <Field label="Ways to play" hint="None ticked: every way.">
        <Ticks
          name="rule-mode"
          all={MODES}
          labels={RULE_MODES}
          picked={rule.modes}
          onChange={(modes) => set({ modes })}
        />
      </Field>
      <Row style={{ alignItems: "start" }}>
        <div style={{ flex: "1 1 140px" }}>
          <Field label="Rounds that are">
            <Select
              name="rule-result"
              value={rule.result ?? "won"}
              onChange={(event) =>
                set({ result: event.target.value as "won" | "played" })
              }
            >
              <option value="won">Won</option>
              <option value="played">Played, won or not</option>
            </Select>
          </Field>
        </div>
        <div style={{ flex: "1 1 140px" }}>
          <Field label="Server">
            <Select
              name="rule-server"
              value={rule.server ?? ""}
              onChange={(event) =>
                set({ server: (event.target.value || undefined) as Server })
              }
            >
              <option value="">Either</option>
              {SERVERS.map((server) => (
                <option key={server} value={server}>
                  {SERVER_NAMES[server]} only
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div style={{ flex: "1 1 140px" }}>
          <Field label="Halos and weapons">
            <Select
              name="rule-silhouette"
              value={
                rule.silhouette === undefined ? "" : String(rule.silhouette)
              }
              onChange={(event) =>
                set({
                  silhouette:
                    event.target.value === ""
                      ? undefined
                      : event.target.value === "true",
                })
              }
            >
              <option value="">Either</option>
              <option value="false">Pictures only</option>
              <option value="true">Silhouettes only</option>
            </Select>
          </Field>
        </div>
      </Row>
      <Row style={{ alignItems: "start" }}>
        <div style={{ flex: "1 1 140px" }}>
          <Field label="Within tries" hint="1 is the first try.">
            <Input
              name="rule-tries"
              type="number"
              min={1}
              placeholder="Any"
              value={rule.tries ?? ""}
              onChange={(event) => set({ tries: numberOf(event.target.value) })}
            />
          </Field>
        </div>
        <div style={{ flex: "1 1 140px" }}>
          <Field
            label="OST clip, seconds"
            hint="Heard at most. Classic: 1, 2, 4, 7, 11, 16."
          >
            <Input
              name="rule-clip"
              type="number"
              min={1}
              max={16}
              placeholder="Any"
              value={rule.clip ?? ""}
              onChange={(event) => set({ clip: numberOf(event.target.value) })}
            />
          </Field>
        </div>
        <div style={{ flex: "1 1 140px" }}>
          <Field label="Students' clock, seconds" hint="Found in under.">
            <Input
              name="rule-seconds"
              type="number"
              min={1}
              placeholder="Any"
              value={rule.seconds ?? ""}
              onChange={(event) =>
                set({ seconds: numberOf(event.target.value) })
              }
            />
          </Field>
        </div>
      </Row>
      {ways ? (
        <Note>
          <strong>Counts from</strong> {ways}
          <Hint>
            A clip keeps it to the OST, a clock to the student game, a server to
            the games that have one, silhouettes to halos and weapons.
          </Hint>
        </Note>
      ) : (
        <Note $tone="bad">
          No way to play has all of this: take something out.
        </Note>
      )}
    </>
  );
}
