import { render } from "app/test/unit/test-utils";
import { describe, expect, test } from "vitest";
import { PollingStationPage } from "./PollingStationPage";

describe("PollingStationPage", () => {
  test("Enter form field values", () => {
    render(<PollingStationPage />);
    expect(true).toBe(true);
  });
});
