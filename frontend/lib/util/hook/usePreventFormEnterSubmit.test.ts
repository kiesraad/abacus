import * as React from "react";
import { describe, expect, test } from "vitest";
import { usePreventFormEnterSubmit } from "./usePreventFormEnterSubmit";
import { renderHook } from "@testing-library/react";

describe("usePreventFormEnterSubmit", () => {
  test("should render", () => {
    const ref = React.createRef<HTMLFormElement>();
    const { result } = renderHook(() => {
      usePreventFormEnterSubmit(ref);
    });
    expect(result.current).toBeDefined();
  });
});
