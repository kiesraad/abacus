import { UserEvent, userEvent } from "@testing-library/user-event";
import * as ReactRouter from "react-router";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { MessagesProvider } from "@/hooks/messages/MessagesProvider";
import * as useUser from "@/hooks/user/useUser";
import { electionMockData } from "@/testing/api-mocks/ElectionMockData";
import { pollingStationMockData } from "@/testing/api-mocks/PollingStationMockData";
import {
  PollingStationDataEntryClaimHandler,
  PollingStationDataEntrySaveHandler,
} from "@/testing/api-mocks/RequestHandlers";
import { validationResultMockData } from "@/testing/api-mocks/ValidationResultMockData";
import { overrideOnce, server } from "@/testing/server";
import { renderReturningRouter, screen, spyOnHandler, waitFor, within } from "@/testing/test-utils";
import { getTypistUser } from "@/testing/user-mock-data";
import { ErrorResponse, SaveDataEntryResponse } from "@/types/generated/openapi";
import { getDataEntryStructure } from "@/utils/dataEntryStructure";

import { DataEntryProvider } from "./DataEntryProvider";
import { DataEntrySection } from "./DataEntrySection";

function renderComponent(sectionId: string) {
  vi.spyOn(ReactRouter, "useParams").mockReturnValue({ sectionId });

  return renderReturningRouter(
    <MessagesProvider>
      <DataEntryProvider election={electionMockData} pollingStation={pollingStationMockData[0]!} entryNumber={1}>
        <DataEntrySection />
      </DataEntryProvider>
    </MessagesProvider>,
  );
}

describe("DataEntrySection", () => {
  beforeEach(() => {
    vi.spyOn(useUser, "useUser").mockReturnValue(getTypistUser());
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

      const title = await screen.findByText("Verschillen tussen aantal kiezers en uitgebrachte stemmen");
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

      const dataEntryStructure = getDataEntryStructure("CSOFirstSession", electionMockData);
      const section = dataEntryStructure.find((s) => s.id === sectionId);
      expect(section?.sectionNumber).toBeUndefined();

      expect(screen.queryByText(/B1-.*/)).not.toBeInTheDocument();
    });
  });

  describe("Session paused", () => {
    test("Redirect when committee session is paused is returned on claim", async () => {
      overrideOnce("post", "/api/polling_stations/1/data_entries/1/claim", 409, {
        error: "Committee session data entry is paused",
        fatal: true,
        reference: "CommitteeSessionPaused",
      } satisfies ErrorResponse);

      const router = renderComponent("extra_investigation");

      await waitFor(() => {
        expect(router.state.location.pathname).toBe("/elections/1/data-entry");
      });
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
      const title = await screen.findByText("Alleen bij extra onderzoek");
      expect(title).toBeInTheDocument();

      const submitButton = screen.getByRole("button", { name: "Volgende" });
      await user.click(submitButton);

      const pausedModal = await screen.findByRole("dialog");
      expect(within(pausedModal).getByRole("heading", { level: 3, name: "Invoer gepauzeerd" })).toBeVisible();
      expect(within(pausedModal).getByRole("paragraph")).toHaveTextContent(
        "De coördinator heeft het invoeren van stemmen gepauzeerd. Je kan niet meer verder. [Je laatste wijzigingen worden niet opgeslagen.]",
      );
      expect(within(pausedModal).getByRole("link", { name: "Afmelden" })).toBeVisible();
      const backToOverviewButton = within(pausedModal).getByRole("link", { name: "Naar startscherm" });
      await user.click(backToOverviewButton);

      expect(router.state.location.pathname).toEqual("/elections");
    });
  });

  test("Shift+enter submits", async () => {
    const user = userEvent.setup();
    renderComponent("extra_investigation");

    const saveHandler = spyOnHandler(PollingStationDataEntrySaveHandler);
    await user.keyboard("{shift>}{enter}{/shift}");

    expect(saveHandler).toHaveBeenCalledOnce();
  });

  describe("Shift+enter with validation warnings/errors", () => {
    let user: UserEvent;
    let acceptErrorsAndWarningsCheckbox: HTMLInputElement;

    beforeEach(async () => {
      user = userEvent.setup();
      overrideOnce("post", "/api/polling_stations/1/data_entries/1", 200, {
        validation_results: { errors: [], warnings: [validationResultMockData.W001] },
      } satisfies SaveDataEntryResponse);
      renderComponent("voters_votes_counts");

      const submitButton = await screen.findByRole("button", { name: "Volgende" });
      await user.click(submitButton);

      acceptErrorsAndWarningsCheckbox = await screen.findByRole("checkbox", {
        name: "Ik heb mijn invoer gecontroleerd met het papier en correct overgenomen.",
      });
    });

    test("focuses on checkbox when pressed shift+enter", async () => {
      expect(acceptErrorsAndWarningsCheckbox).not.toHaveFocus();

      await user.keyboard("{shift>}{enter}{/shift}");
      expect(acceptErrorsAndWarningsCheckbox).toHaveFocus();
    });

    test("focuses on checkbox again after refocusing to another element and pressing shift+enter", async () => {
      expect(acceptErrorsAndWarningsCheckbox).not.toHaveFocus();
      await user.keyboard("{shift>}{enter}{/shift}");
      expect(acceptErrorsAndWarningsCheckbox).toHaveFocus();

      // Refocus to first input
      const firstInput = await screen.findByRole("textbox", { name: "A Stempassen" });
      await user.click(firstInput);
      expect(acceptErrorsAndWarningsCheckbox).not.toHaveFocus();

      // Try again
      await user.keyboard("{shift>}{enter}{/shift}");
      expect(acceptErrorsAndWarningsCheckbox).toHaveFocus();
    });
  });
});
