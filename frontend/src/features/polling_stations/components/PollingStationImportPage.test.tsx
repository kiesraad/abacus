import { describe, expect, test, vi } from "vitest";

import { ElectionProvider } from "@/hooks/election/ElectionProvider";
import { useMessages } from "@/hooks/messages/useMessages";
import { ElectionRequestHandler } from "@/testing/api-mocks/RequestHandlers";
import { server } from "@/testing/server";
import { render, screen } from "@/testing/test-utils";

import { PollingStationImportPage } from "./PollingStationImportPage";

vi.mock("@/hooks/messages/useMessages");

describe("PollingStationImportPage", () => {
  test("Shows form", async () => {
    server.use(ElectionRequestHandler);
    vi.mocked(useMessages).mockReturnValue({ pushMessage: vi.fn(), popMessages: vi.fn(() => []) });

    render(
      <ElectionProvider electionId={1}>
        <PollingStationImportPage />
      </ElectionProvider>,
    );

    expect(await screen.findByRole("heading", { level: 1, name: "Stembureaus importeren" })).toBeVisible();
  });
});
