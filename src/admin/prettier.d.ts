/**
 * Prettier 2's API as far as the admin tool's server uses it, to write the
 * content files as format:check wants them (Prettier 2 ships no types, and
 * as a CommonJS module it's its default export).
 */
declare module "prettier" {
  interface Options {
    filepath?: string;
    [option: string]: unknown;
  }
  const prettier: {
    resolveConfig(file: string): Promise<Options | null>;
    format(source: string, options: Options): string;
  };
  export default prettier;
}
