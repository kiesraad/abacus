import { waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event/dist/cjs/index.js";
import { HttpResponse, http } from "msw";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { ElectionProvider } from "@/hooks/election/ElectionProvider";
import * as useElectionStatus from "@/hooks/election/useElectionStatus";
import type { Message } from "@/hooks/messages/MessagesContext";
import { MessagesProvider } from "@/hooks/messages/MessagesProvider";
import * as useMessages from "@/hooks/messages/useMessages";
import * as useUser from "@/hooks/user/useUser";
import {
  electionDetailsMockResponse,
  getCSBElectionMockData,
  getElectionMockData,
} from "@/testing/api-mocks/ElectionMockData";
import { getElectionStatusMockData, statusResponseMock } from "@/testing/api-mocks/ElectionStatusMockData";
import { ElectionListRequestHandler, ElectionRequestHandler } from "@/testing/api-mocks/RequestHandlers";
import { server } from "@/testing/server";
import { renderReturningRouter, screen, within } from "@/testing/test-utils";
import { getTypistUser } from "@/testing/user-mock-data";
import type {
  CommitteeCategory,
  CommitteeSession,
  ElectionDetailsResponse,
  ElectionStatusResponse,
} from "@/types/generated/openapi";
import { DataEntryHomePage } from "./DataEntryHomePage";

async function renderDataEntryHomePage(
  category: CommitteeCategory,
  session: Partial<CommitteeSession> = {},
  { statuses }: ElectionStatusResponse = statusResponseMock,
) {
  let electionResponse: ElectionDetailsResponse;
  switch (category) {
    case "GSB":
      electionResponse = getElectionMockData({}, session);
      break;
    case "CSB":
      electionResponse = getCSBElectionMockData({}, session);
      break;
  }
  server.use(http.get("/api/elections/1", () => HttpResponse.json(electionResponse, { status: 200 })));

  const refetch = vi.fn();
  vi.spyOn(useElectionStatus, "useElectionStatus").mockReturnValue({ statuses, refetch });

  const router = renderReturningRouter(
    <ElectionProvider electionId={1}>
      <MessagesProvider>
        <DataEntryHomePage />
      </MessagesProvider>
    </ElectionProvider>,
  );
  expect(await screen.findByRole("heading", { level: 1, name: electionResponse.election.name })).toBeVisible();

  return { router, refetch };
}

describe("DataEntryHomePage", () => {
  beforeEach(() => {
    vi.spyOn(useUser, "useUser").mockReturnValue(getTypistUser());
    server.use(ElectionListRequestHandler, ElectionRequestHandler);
  });

  test.each(["GSB", "CSB"] as const)("Alert not visible when unfinished (%s)", async (cat: CommitteeCategory) => {
    await renderDataEntryHomePage(cat);

    // Wait for the page to be loaded
    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: electionDetailsMockResponse.election.name,
      }),
    ).toBeVisible();

    // Test that the message doesn't exist
    expect(screen.queryByText("Alle stembureaus zijn ingevoerd")).not.toBeInTheDocument();
  });

  test.each(["GSB", "CSB"] as const)("Alert visible when completed (%s)", async (cat: CommitteeCategory) => {
    const statusResponse = getElectionStatusMockData([{ status: "definitive" }, { status: "definitive" }]);
    await renderDataEntryHomePage(cat, {}, statusResponse);

    expect(await screen.findByText("Alle stembureaus zijn ingevoerd")).toBeVisible();
  });

  test.each(["GSB", "CSB"] as const)("Messages are shown (%s)", async (cat: CommitteeCategory) => {
    vi.spyOn(useMessages, "useMessages").mockReturnValue({
      hasMessages: vi.fn(),
      popMessages: vi.fn(() => [{ title: "Let op: fouten in het proces-verbaal" }] as Message[]),
      pushMessage: vi.fn(),
    });

    await renderDataEntryHomePage(cat);

    const alert = await screen.findByRole("alert");
    expect(within(alert).getByRole("strong")).toHaveTextContent("Let op: fouten in het proces-verbaal");
  });

  test.each(["GSB", "CSB"] as const)("Show different title for next entry (%s)", async (cat: CommitteeCategory) => {
    const { router } = await renderDataEntryHomePage(cat);
    expect(await screen.findByRole("heading", { name: "Welk stembureau ga je invoeren?" })).toBeVisible();

    await router.navigate({ hash: "next" });
    await waitFor(() => {
      expect(screen.queryByRole("heading", { name: "Welk stembureau ga je invoeren?" })).not.toBeInTheDocument();
    });
    expect(await screen.findByRole("heading", { name: "Verder met een volgend stembureau?" })).toBeVisible();
  });

  test.each(["GSB", "CSB"] as const)("Show alert when session is paused (%s)", async (cat: CommitteeCategory) => {
    await renderDataEntryHomePage(cat, { status: "paused" });

    const pausedModal = await screen.findByRole("dialog");
    expect(within(pausedModal).getByRole("heading", { level: 3, name: "Invoer gepauzeerd" })).toBeVisible();
    expect(within(pausedModal).getByRole("paragraph")).toHaveTextContent(
      "De coördinator heeft het invoeren van stemmen gepauzeerd. Je kan niet meer verder.",
    );
    expect(within(pausedModal).getByRole("link", { name: "Naar startscherm" })).toBeVisible();
    expect(within(pausedModal).getByRole("link", { name: "Afmelden" })).toBeVisible();
  });

  test("Refresh statuses when the collapsed data entry list is opened", async () => {
    const { refetch } = await renderDataEntryHomePage("GSB");
    await waitFor(() => {
      expect(refetch).toHaveBeenCalledTimes(1);
    });

    const user = userEvent.setup();
    const openList = await screen.findByTestId("openList");
    await user.click(openList);
    expect(refetch).toHaveBeenCalledTimes(2);
  });

  test("Show picker and collapsed list for GSB", async () => {
    await renderDataEntryHomePage("GSB");

    // Show picker and collapsed list
    expect(await screen.findByLabelText("Voer het nummer in:")).toBeVisible();
    expect(await screen.findByTestId("openList")).toBeVisible();

    // List is hidden
    expect(screen.queryByRole("heading", { name: "Kies het stembureau" })).not.toBeVisible();
    expect(screen.queryByRole("table")).not.toBeVisible();
  });

  test("Show only expanded list for CSB", async () => {
    await renderDataEntryHomePage("CSB");

    // Picker and collapsed list not rendered
    expect(screen.queryByLabelText("Voer het nummer in:")).not.toBeInTheDocument();
    expect(screen.queryByTestId("openList")).not.toBeInTheDocument();

    // List is shown
    expect(await screen.findByRole("heading", { name: "Kies het stembureau" })).toBeVisible();
    expect(await screen.findByRole("table")).toBeVisible();
  });
});
