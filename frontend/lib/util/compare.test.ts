import { describe, expect, test } from "vitest";

import { deepEqual, isPrimitive } from "./compare";

describe("Compare util", () => {
  test.each([
    ["test", true],
    [4, true],
    [true, true],
    [null, true],
    [false, true],
    [{ foo: "bar" }, false],
  ])("isPrimitive %s = %s", (input, expected: boolean) => {
    expect(isPrimitive(input)).equals(expected);
  });

  test("deepEqual", () => {
    const obj1A = { foo: "bar" };
    const obj1B = { foo: "bar" };

    expect(deepEqual(obj1A, obj1B)).equals(true);

    const obj2A = { foo: "bar" };
    const obj2B = { foo: "baz" };

    expect(deepEqual(obj2A, obj2B)).equals(false);

    const obj3A = { foo: { bar: "baz" } };
    const obj3B = { foo: { bar: "baz" } };

    expect(deepEqual(obj3A, obj3B)).equals(true);

    const obj4A = { foo: 0 };
    const obj4B = { foo: 0 };
    expect(deepEqual(obj4A, obj4B)).equals(true);

    const obj5A = { foo: 0 };
    const obj5B = { foo: "" };
    expect(deepEqual(obj5A, obj5B, true)).equals(true);
  });
});
