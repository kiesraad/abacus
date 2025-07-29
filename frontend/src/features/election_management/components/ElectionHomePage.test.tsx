import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, test } from "vitest";

import { ElectionProvider } from "@/hooks/election/ElectionProvider";
import { ElectionStatusProvider } from "@/hooks/election/ElectionStatusProvider";
import { getElectionMockData } from "@/testing/api-mocks/ElectionMockData";
import {
  ElectionCommitteeSessionListRequestHandler,
  ElectionRequestHandler,
} from "@/testing/api-mocks/RequestHandlers";
import { overrideOnce, server } from "@/testing/server";
import { render, screen, within } from "@/testing/test-utils";
import { TestUserProvider } from "@/testing/TestUserProvider";
import { ElectionDetailsResponse } from "@/types/generated/openapi";

import { ElectionHomePage } from "./ElectionHomePage";

const renderPage = async () => {
  render(
    <TestUserProvider userRole="coordinator">
      <ElectionProvider electionId={1}>
        <ElectionStatusProvider electionId={1}>
          <ElectionHomePage />
        </ElectionStatusProvider>
      </ElectionProvider>
    </TestUserProvider>,
  );
  expect(await screen.findByRole("heading", { level: 1, name: "Gemeenteraadsverkiezingen 2026" })).toBeVisible();
  expect(
    await screen.findByRole("heading", { level: 2, name: "Gemeentelijk stembureau 0035 Heemdamseburg" }),
  ).toBeVisible();
};

describe("ElectionHomePage", () => {
  beforeEach(() => {
    server.use(ElectionCommitteeSessionListRequestHandler);
  });

  test("Shows committee session card(s) and election information table", async () => {
    server.use(ElectionRequestHandler);
    overrideOnce("get", "/api/elections/1/status", 200, {
      statuses: [],
    });

    await renderPage();

    const committee_session_cards = await screen.findByTestId("committee-session-cards");
    expect(committee_session_cards).toBeVisible();
    expect(within(committee_session_cards).getByText("Tweede zitting")).toBeVisible();
    expect(within(committee_session_cards).getByText("— Steminvoer bezig")).toBeInTheDocument();
    expect(within(committee_session_cards).getByText("Eerste zitting")).toBeVisible();
    expect(within(committee_session_cards).getByText("— Steminvoer afgerond")).toBeInTheDocument();

    expect(await screen.findByRole("heading", { level: 3, name: "Over deze verkiezing" })).toBeVisible();
    const election_information_table = await screen.findByTestId("election-information-table");
    expect(election_information_table).toBeVisible();
    expect(election_information_table).toHaveTableContent([
      ["Verkiezing", "Gemeenteraadsverkiezingen 2026, 30 november"],
      ["Kiesgebied", "0035 - Gemeente Heemdamseburg"],
      ["Lijsten en kandidaten", "2 lijsten en 31 kandidaten"],
      ["Aantal kiesgerechtigden", "2.000"],
      ["Invoer doen voor", "Gemeentelijk stembureau"],
      ["Stembureaus", "8 stembureaus"],
      ["Type stemopneming", "Centrale stemopneming"],
    ]);
  });

  test("Shows alert when there are no polling stations", async () => {
    const electionData = getElectionMockData();
    electionData.polling_stations = [];
    server.use(
      http.get("/api/elections/1", () =>
        HttpResponse.json(electionData satisfies ElectionDetailsResponse, { status: 200 }),
      ),
    );
    overrideOnce("get", "/api/elections/1/status", 200, {
      statuses: [],
    });

    await renderPage();

    const alert = await screen.findByRole("alert");
    expect(within(alert).getByText("Geen stembureaus")).toBeVisible();
    expect(
      within(alert).getByText("De invoerfase kan pas gestart worden als er stembureaus zijn toegevoegd."),
    ).toBeVisible();
    expect(within(alert).getByRole("link", { name: "Stembureaus beheren" })).toBeVisible();

    const committee_session_cards = await screen.findByTestId("committee-session-cards");
    expect(committee_session_cards).toBeVisible();
    expect(within(committee_session_cards).getByText("Tweede zitting")).toBeVisible();
    expect(within(committee_session_cards).getByText("— Steminvoer bezig")).toBeInTheDocument();
    expect(within(committee_session_cards).getByText("Eerste zitting")).toBeVisible();
    expect(within(committee_session_cards).getByText("— Steminvoer afgerond")).toBeInTheDocument();

    expect(await screen.findByRole("heading", { level: 3, name: "Over deze verkiezing" })).toBeVisible();
    const election_information_table = await screen.findByTestId("election-information-table");
    expect(election_information_table).toBeVisible();
    expect(election_information_table).toHaveTableContent([
      ["Verkiezing", "Gemeenteraadsverkiezingen 2026, 30 november"],
      ["Kiesgebied", "0035 - Gemeente Heemdamseburg"],
      ["Lijsten en kandidaten", "2 lijsten en 31 kandidaten"],
      ["Aantal kiesgerechtigden", "2.000"],
      ["Invoer doen voor", "Gemeentelijk stembureau"],
      ["Stembureaus", "0 stembureaus"],
      ["Type stemopneming", "Centrale stemopneming"],
    ]);
  });
});
