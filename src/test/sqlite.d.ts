/**
 * Node's own SQLite (node:sqlite), for the accounts tests' database (see
 * fakeD1.ts). Declared here as far as the tests use it: the project's types
 * leave Node's out, so the browser code can't reach for them by mistake.
 */
declare module "node:sqlite" {
  export class DatabaseSync {
    constructor(path: string);
    exec(sql: string): void;
    prepare(sql: string): {
      get(...values: unknown[]): unknown;
      all(...values: unknown[]): unknown[];
      run(...values: unknown[]): { changes: number | bigint };
    };
  }
}
