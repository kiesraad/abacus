import { describe, expect, test } from "vitest";

import { ElectionProvider } from "@/api/election/ElectionProvider";
import { ElectionRequestHandler } from "@/testing/api-mocks/RequestHandlers";
import { server } from "@/testing/server";
import { render, screen } from "@/testing/test-utils";

import { PollingStationCreatePage } from "./PollingStationCreatePage";

describe("PollingStationCreatePage", () => {
  test("Shows form", async () => {
    server.use(ElectionRequestHandler);

    render(
      <ElectionProvider electionId={1}>
        <PollingStationCreatePage />
      </ElectionProvider>,
    );

    const form = await screen.findByTestId("polling-station-form");
    expect(form).toBeVisible();
  });
});
