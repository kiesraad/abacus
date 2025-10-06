import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

import * as useMessages from "@/hooks/messages/useMessages";
import { ElectionProvider } from "@/hooks/election/ElectionProvider";
import { pollingStationRequestMockData } from "@/testing/api-mocks/PollingStationRequestMockData";
import { ElectionRequestHandler, PollingStationListRequestHandler } from "@/testing/api-mocks/RequestHandlers";
import { server } from "@/testing/server";
import { render, screen } from "@/testing/test-utils";

import { PollingStationsPreview } from "./PollingStationsPreview";

describe("PollingStationsPreview", () => {
  beforeEach(() => {
    server.use(ElectionRequestHandler, PollingStationListRequestHandler);
    vi.spyOn(useMessages, "useMessages").mockReturnValue({
      pushMessage: vi.fn(),
      popMessages: vi.fn(() => []),
      hasMessages: vi.fn(() => false),
    });
  });

  test("Show polling stations", async () => {
    render(
      <ElectionProvider electionId={1}>
        <PollingStationsPreview pollingStations={pollingStationRequestMockData} />
      </ElectionProvider>,
    );

    // Check the overview table
    expect(await screen.findByRole("table")).toBeVisible();
    expect(await screen.findAllByRole("row")).toHaveLength(10);
  });

  test("Show more polling stations when button is pressed", async () => {
    render(
      <ElectionProvider electionId={1}>
        <PollingStationsPreview pollingStations={pollingStationRequestMockData} />
      </ElectionProvider>,
    );

    const user = userEvent.setup();
    expect(await screen.findByRole("table")).toBeVisible();
    expect(await screen.findAllByRole("row")).toHaveLength(10);

    // Click show more button
    const showMoreButton = screen.getByRole("button", { name: /Toon alle \d+ stembureaus/ });
    expect(showMoreButton).toBeVisible();
    await user.click(showMoreButton);

    expect(await screen.findAllByRole("row")).toHaveLength(11);
  });
});
