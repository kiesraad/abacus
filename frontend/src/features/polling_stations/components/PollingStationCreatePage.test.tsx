import { screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { ElectionProvider } from "@/api";
import { render, server } from "@/testing";
import { ElectionRequestHandler } from "@/testing/api-mocks/RequestHandlers";

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
