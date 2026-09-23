/** Injected by Vite's `define` at build time. */
declare const __BUILD_DATE__: string;

interface ImportMetaEnv {
  /** Where the Theme_*.ogg files are served from. Defaults to `/audio`. */
  readonly VITE_AUDIO_BASE_URL?: string;
}
