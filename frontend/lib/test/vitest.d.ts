import "vitest";

declare module "vitest" {
  interface Assertion<T = unknown> {
    toHaveTableContent(expected: string[][]): T;
  }
}
