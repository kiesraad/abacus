import "@vitest/expect";

declare module "@vitest/expect" {
  interface JestAssertion {
    toHaveTableContent(expected: string[][]): T;
  }
}
