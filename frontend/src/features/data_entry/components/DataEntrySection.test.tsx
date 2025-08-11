import { useParams } from "react-router";

import { userEvent } from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { useUser } from "@/hooks/user/useUser";
import { electionMockData } from "@/testing/api-mocks/ElectionMockData";
import {
  PollingStationDataEntryClaimHandler,
  PollingStationDataEntrySaveHandler,
} from "@/testing/api-mocks/RequestHandlers";
import { overrideOnce, server } from "@/testing/server";
import { renderReturningRouter, screen, within } from "@/testing/test-utils";
import { getTypistUser } from "@/testing/user-mock-data";
import { ErrorResponse } from "@/types/generated/openapi";
import { getDataEntryStructure } from "@/utils/dataEntryStructure";

import { DataEntryProvider } from "./DataEntryProvider";
import { DataEntrySection } from "./DataEntrySection";

vi.mock("@/hooks/user/useUser");
vi.mock("react-router");

function renderComponent(sectionId: string) {
  vi.mocked(useParams).mockReturnValue({ sectionId });

  return renderReturningRouter(
    <DataEntryProvider election={electionMockData} pollingStationId={1} entryNumber={1}>
      <DataEntrySection />
    </DataEntryProvider>,
  );
}

describe("DataEntrySection", () => {
  beforeEach(() => {
    vi.mocked(useUser).mockReturnValue(getTypistUser());
    server.use(PollingStationDataEntryClaimHandler, PollingStationDataEntrySaveHandler);
  });

  describe("Section Badge Display", () => {
    test("displays badge for voters_votes_counts section", async () => {
      renderComponent("voters_votes_counts");

      const title = await screen.findByText("Toegelaten kiezers en uitgebrachte stemmen");
      expect(title).toBeInTheDocument();

      const badge = screen.getByText("B1-3.1 en 3.2");
      expect(badge).toBeInTheDocument();
    });

    test("displays badge for differences_counts section", async () => {
      renderComponent("differences_counts");

      const title = await screen.findByText("Verschillen tussen toegelaten kiezers en uitgebrachte stemmen");
      expect(title).toBeInTheDocument();

      const badge = screen.getByText("B1-3.3");
      expect(badge).toBeInTheDocument();
    });

    test.each([
      {
        sectionId: "political_group_votes_1",
        expectedTitle: "Lijst 1 - Vurige Vleugels Partij",
      },
      {
        sectionId: "political_group_votes_2",
        expectedTitle: "Lijst 2 - Wijzen van Water en Wind",
      },
    ])("does not display badge for $sectionId", async ({ sectionId, expectedTitle }) => {
      renderComponent(sectionId);

      const title = await screen.findByText(expectedTitle);
      expect(title).toBeInTheDocument();

      const dataEntryStructure = getDataEntryStructure(electionMockData);
      const section = dataEntryStructure.find((s) => s.id === sectionId);
      expect(section?.sectionNumber).toBeUndefined();

      expect(screen.queryByText(/B1-.*/)).not.toBeInTheDocument();
    });

    test("Alert when committee session is paused is shown on save and navigate back to overview", async () => {
      const user = userEvent.setup();
      overrideOnce("post", "/api/polling_stations/1/data_entries/1", 409, {
        error: "Committee session data entry is paused",
        fatal: true,
        reference: "CommitteeSessionPaused",
      } satisfies ErrorResponse);

      const router = renderComponent("extra_investigation");

      // Wait for the page to be loaded
      const title = await screen.findByText("Extra onderzoek");
      expect(title).toBeInTheDocument();

      const submitButton = screen.getByRole("button", { name: "Volgende" });
      await user.click(submitButton);

      const pausedModal = await screen.findByRole("dialog");
      expect(within(pausedModal).getByRole("heading", { level: 2, name: "Invoer gepauzeerd" })).toBeVisible();
      expect(within(pausedModal).getByRole("paragraph")).toHaveTextContent(
        "De coördinator heeft het invoeren van stemmen gepauzeerd. Je kan niet meer verder. [Je laatste wijzigingen worden niet opgeslagen.]",
      );
      expect(within(pausedModal).getByRole("link", { name: "Afmelden" })).toBeVisible();
      const backToOverviewButton = within(pausedModal).getByRole("link", { name: "Naar startscherm" });
      await user.click(backToOverviewButton);

      expect(router.state.location.pathname).toEqual("/elections");
    });
  });
});
