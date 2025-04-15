import { expect, test } from "vitest";

import { classnames, cn } from "./classnames";

test("classnames result", () => {
  const result = classnames("test", { test2: true, test3: false });
  const result2 = cn("test", { test2: true, test3: false });
  expect(result2).toBe(result);
  expect(result).toBe("test test2");
});
