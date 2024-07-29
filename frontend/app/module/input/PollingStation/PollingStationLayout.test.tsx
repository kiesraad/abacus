import { describe, expect, test } from "vitest";

import { PollingStationLayout } from "app/module/input";
import { render } from "app/test/unit";

import { ElectionListProvider, ElectionProvider } from "@kiesraad/api";

describe("PollingStationLayout", () => {
  test("Render", () => {
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
