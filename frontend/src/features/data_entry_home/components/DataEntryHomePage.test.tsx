import { waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { ElectionProvider } from "@/hooks/election/ElectionProvider";
import { ElectionStatusProvider } from "@/hooks/election/ElectionStatusProvider";
import type { Message } from "@/hooks/messages/MessagesContext";
import { MessagesProvider } from "@/hooks/messages/MessagesProvider";
import * as useMessages from "@/hooks/messages/useMessages";
import * as useUser from "@/hooks/user/useUser";
import { electionDetailsMockResponse, getElectionMockData } from "@/testing/api-mocks/ElectionMockData";
import { getElectionStatusMockData } from "@/testing/api-mocks/ElectionStatusMockData";
import {
  ElectionListRequestHandler,
  ElectionRequestHandler,
  ElectionStatusRequestHandler,
} from "@/testing/api-mocks/RequestHandlers";
import { overrideOnce, server } from "@/testing/server";
import { renderReturningRouter, screen, within } from "@/testing/test-utils";
import { getTypistUser } from "@/testing/user-mock-data";
import type { ElectionDetailsResponse } from "@/types/generated/openapi";
import { DataEntryHomePage } from "./DataEntryHomePage";

const renderDataEntryHomePage = () =>
  renderReturningRouter(
    <ElectionProvider electionId={1}>
      <ElectionStatusProvider electionId={1}>
        <MessagesProvider>
          <DataEntryHomePage />
        </MessagesProvider>
      </ElectionStatusProvider>
    </ElectionProvider>,
  );

describe("DataEntryHomePage", () => {
  beforeEach(() => {
    vi.spyOn(useUser, "useUser").mockReturnValue(getTypistUser());
    server.use(ElectionListRequestHandler, ElectionRequestHandler, ElectionStatusRequestHandler);
    overrideOnce("get", "/api/elections/1", 200, electionDetailsMockResponse);
  });

  test("Election name", async () => {
    renderDataEntryHomePage();

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: electionDetailsMockResponse.election.name,
      }),
    ).toBeVisible();
  });

  test("Alert not visible when uncompleted", async () => {
    renderDataEntryHomePage();

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

  test("Alert visible when completed", async () => {
    overrideOnce(
      "get",
      "/api/elections/1/status",
      200,
      getElectionStatusMockData([{ status: "definitive" }, { status: "definitive" }]),
    );

    renderDataEntryHomePage();

    expect(await screen.findByText("Alle stembureaus zijn ingevoerd")).toBeVisible();
  });

  test("Messages are shown", async () => {
    vi.spyOn(useMessages, "useMessages").mockReturnValue({
      hasMessages: vi.fn(),
      popMessages: vi.fn(() => [{ title: "Let op: fouten in het proces-verbaal" }] as Message[]),
      pushMessage: vi.fn(),
    });

    renderDataEntryHomePage();

    const alert = await screen.findByRole("alert");
    expect(within(alert).getByRole("strong")).toHaveTextContent("Let op: fouten in het proces-verbaal");
  });

  test("Show different title for next data entry", async () => {
    const router = renderDataEntryHomePage();
    expect(await screen.findByRole("heading", { name: "Welk stembureau ga je invoeren?" })).toBeVisible();

    await router.navigate({ hash: "next" });
    await waitFor(() => {
      expect(screen.queryByRole("heading", { name: "Welk stembureau ga je invoeren?" })).not.toBeInTheDocument();
    });
    expect(await screen.findByRole("heading", { name: "Verder met een volgend stembureau?" })).toBeVisible();
  });

  test("Alert when committee session is paused is shown", async () => {
    server.use(
      http.get("/api/elections/1", () =>
        HttpResponse.json(getElectionMockData({}, { status: "paused" }) satisfies ElectionDetailsResponse, {
          status: 200,
        }),
      ),
    );

    renderDataEntryHomePage();

    // Wait for the page to be loaded
    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: electionDetailsMockResponse.election.name,
      }),
    ).toBeVisible();

    const pausedModal = await screen.findByRole("dialog");
    expect(within(pausedModal).getByRole("heading", { level: 3, name: "Invoer gepauzeerd" })).toBeVisible();
    expect(within(pausedModal).getByRole("paragraph")).toHaveTextContent(
      "De coördinator heeft het invoeren van stemmen gepauzeerd. Je kan niet meer verder.",
    );
    expect(within(pausedModal).getByRole("link", { name: "Naar startscherm" })).toBeVisible();
    expect(within(pausedModal).getByRole("link", { name: "Afmelden" })).toBeVisible();
  });
});
