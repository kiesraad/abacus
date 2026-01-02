import "@vitest/expect";
import "vitest";

declare module "vitest" {
  interface Assertion {
    toHaveTableContent(expected: string[][]): T;
  }
}

declare module "@vitest/expect" {
  interface JestAssertion {
    toHaveTableContent(expected: string[][]): T;
  }
}
