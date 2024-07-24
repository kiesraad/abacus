import { describe, expect, test } from "vitest";

import { render } from "app/test/unit";

import { ElectionListProvider, ElectionProvider } from "@kiesraad/api";

import { PollingStationLayout } from "./PollingStationLayout";

describe("PollingStationLayout", () => {
  test("Enter form field values", () => {
    render(
      <ElectionListProvider>
        <ElectionProvider electionId={1}>
          <PollingStationLayout />
        </ElectionProvider>
      </ElectionListProvider>,
    );
    expect(true).toBe(true);
  });
});
