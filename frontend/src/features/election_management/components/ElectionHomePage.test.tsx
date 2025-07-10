import { beforeEach, describe, expect, test } from "vitest";

import { ElectionProvider } from "@/hooks/election/ElectionProvider";
import { ElectionStatusProvider } from "@/hooks/election/ElectionStatusProvider";
import {
  ElectionCommitteeSessionListRequestHandler,
  ElectionRequestHandler,
} from "@/testing/api-mocks/RequestHandlers";
import { overrideOnce, server } from "@/testing/server";
import { render, screen, within } from "@/testing/test-utils";
import { TestUserProvider } from "@/testing/TestUserProvider";

import { ElectionHomePage } from "./ElectionHomePage";

describe("ElectionHomePage", () => {
  beforeEach(() => {
    server.use(ElectionRequestHandler, ElectionCommitteeSessionListRequestHandler);
  });

  test("Shows committee session card(s) and election information table", async () => {
    overrideOnce("get", "/api/elections/1/status", 200, {
      statuses: [],
    });

    render(
      <TestUserProvider userRole="coordinator">
        <ElectionProvider electionId={1}>
          <ElectionStatusProvider electionId={1}>
            <ElectionHomePage />
          </ElectionStatusProvider>
        </ElectionProvider>
      </TestUserProvider>,
    );

    // Wait for the page to be loaded
    expect(await screen.findByRole("heading", { level: 1, name: "Gemeenteraadsverkiezingen 2026" })).toBeVisible();
    expect(await screen.findByRole("heading", { level: 2, name: "0035 Heemdamseburg" })).toBeVisible();

    const committee_session_cards = await screen.findByTestId("committee-session-cards");
    expect(committee_session_cards).toBeVisible();
    expect(within(committee_session_cards).getByText("Tweede zitting")).toBeVisible();
    expect(within(committee_session_cards).getByText("— Invoerders bezig")).toBeInTheDocument();
    expect(within(committee_session_cards).getByText("Eerste zitting")).toBeVisible();
    expect(within(committee_session_cards).getByText("— Invoerders klaar")).toBeInTheDocument();

    expect(await screen.findByRole("heading", { level: 3, name: "Over deze verkiezing" })).toBeVisible();
    const election_information_table = await screen.findByTestId("election-information-table");
    expect(election_information_table).toBeVisible();
    expect(election_information_table).toHaveTableContent([
      ["Verkiezing", "Gemeenteraadsverkiezingen 2026, 30 november"],
      ["Kiesgebied", "0035 - Gemeente Heemdamseburg"],
      ["Lijsten en kandidaten", "2 lijsten en 31 kandidaten"],
      ["Aantal kiesgerechtigden", "100"],
      ["Invoer doen voor", ""],
      ["Stembureaus", "5 stembureaus"],
      ["Type stemopneming", ""],
    ]);
  });
});
