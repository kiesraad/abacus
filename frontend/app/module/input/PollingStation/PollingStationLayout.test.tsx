import { render } from "app/test/unit";
import { describe, expect, test } from "vitest";
import { PollingStationLayout } from "./PollingStationLayout";
import { ElectionListProvider, ElectionProvider } from "@kiesraad/api";

describe("PollingStationLayout", () => {
  test("Enter form field values", () => {
    render(
      <ElectionListProvider>
        <ElectionProvider>
          <PollingStationLayout />
        </ElectionProvider>
      </ElectionListProvider>,
    );
    expect(true).toBe(true);
  });
});
