import { describe, expect, test } from "vitest";

import { classnames, cn } from "./classnames";

describe("classnames", () => {
  test("object with classname keys and boolean values", () => {
    const result = classnames("test", { test2: true, test3: false });
    expect(result).toBe("test test2");
  });

  test("shorthand import", () => {
    const result = cn("test", { test2: true, test3: false });
    expect(result).toBe("test test2");
  });

  test("false and undefined are skipped", () => {
    const forProps = ({ extraClasses, prop }: { extraClasses?: string; prop?: boolean }) =>
      cn("test", extraClasses, prop && "prop-class");

    expect(forProps({})).toBe("test");
    expect(forProps({ extraClasses: "mb-4", prop: true })).toBe("test mb-4 prop-class");
  });
});
