import { render } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { PollingStationPage } from "./PollingStationPage";

describe("PollingStationPage", () => {
  test("Enter form field values", () => {
    render(<PollingStationPage />);
    expect(true).toBe(true);
  });
});
