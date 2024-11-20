import { describe, expect, test, vi } from "vitest";

import { callAsync } from "./async";

describe("async utils", () => {
  test("callAsync", async () => {
    const asyncFn = vi.fn(async (a: number, b: number) => {
      await new Promise((resolve) => setTimeout(resolve, 1));
      return a + b;
    });

    callAsync(asyncFn, 1, 2);

    // Wait for the async function to be called
    await new Promise((resolve) => setTimeout(resolve, 2));

    // Assert the function was called once
    expect(asyncFn).toHaveBeenCalledTimes(1);

    // Assert the function was called with the correct arguments
    expect(asyncFn).toHaveBeenCalledWith(1, 2);
  });
});
