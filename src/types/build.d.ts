/** Injected by Vite's `define` at build time. */
declare const __BUILD_DATE__: string;

interface ImportMetaEnv {
  /** Where the Theme_*.ogg files are served from. Defaults to `/audio`. */
  readonly VITE_AUDIO_BASE_URL?: string;
  /** The same files on R2, tried when the base URL fails. None in dev. */
  readonly VITE_AUDIO_BACKUP_URL?: string;
  /** Where the hub reads now.json, what is on in Global. Defaults to `/now`. */
  readonly VITE_NOW_URL?: string;
  /**
   * The multiplayer rooms Worker, as a ws:// or wss:// address. Defaults to
   * the one `npm run rooms` runs locally.
   */
  readonly VITE_ROOMS_URL?: string;
  /**
   * The accounts Worker (accounts-worker/). Set for the site's preview only
   * (.env.preview) until accounts are released; the dev server uses the one
   * `npm run accounts` runs locally. Without one, sign-in isn't shown.
   */
  readonly VITE_ACCOUNTS_URL?: string;
}
