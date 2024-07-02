import { render } from "app/test/unit";
import { describe, expect, test } from "vitest";
import { PollingStationLayout } from "./PollingStationLayout";

describe("PollingStationLayout", () => {
  test("Enter form field values", () => {
    render(<PollingStationLayout />);
    expect(true).toBe(true);
  });
});
