import "storybook/test";
import "vitest";

declare module "vitest" {
  interface Matchers<R> {
    toHaveTableContent(expected: string[][]): R;
  }
}

declare module "storybook/test" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- `T` must match the Storybook declaration
  interface Assertion<T> {
    toHaveTableContent(expected: string[][]): Promise<void>;
  }
}
