import { beforeEach, describe, expect, test } from "vitest";

import { ElectionProvider } from "@/hooks/election/ElectionProvider";
import { ElectionStatusProvider } from "@/hooks/election/ElectionStatusProvider";
import { getElectionMockData } from "@/testing/api-mocks/ElectionMockData";
import { ElectionRequestHandler, ElectionStatusRequestHandler } from "@/testing/api-mocks/RequestHandlers";
import { overrideOnce, server } from "@/testing/server";
import { render, screen } from "@/testing/test-utils";

import { FinishDataEntryPage } from "./FinishDataEntryPage";

describe("FinishDataEntryPage", () => {
  beforeEach(() => {
    server.use(ElectionRequestHandler, ElectionStatusRequestHandler);
  });

  test("Shows page", async () => {
    overrideOnce("get", "/api/elections/1", 200, getElectionMockData({}, { status: "data_entry_in_progress" }));

    render(
      <ElectionProvider electionId={1}>
        <ElectionStatusProvider electionId={1}>
          <FinishDataEntryPage />
        </ElectionStatusProvider>
      </ElectionProvider>,
    );

    // Wait for the page to be loaded
    expect(await screen.findByRole("heading", { level: 1, name: "Steminvoer eerste zitting afronden" })).toBeVisible();
    expect(await screen.findByRole("heading", { level: 2, name: "Invoerfase afronden?" })).toBeVisible();
    expect(await screen.findByRole("button", { name: "Invoerfase afronden" })).toBeVisible();
    expect(await screen.findByRole("link", { name: "In invoerfase blijven" })).toBeVisible();
  });
});
