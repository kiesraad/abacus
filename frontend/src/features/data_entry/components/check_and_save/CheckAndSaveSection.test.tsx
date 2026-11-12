import { userEvent } from "@testing-library/user-event";
import * as ReactRouter from "react-router";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { CheckAndSaveSection } from "@/features/data_entry/components/check_and_save/CheckAndSaveSection";
import { ElectionProvider } from "@/hooks/election/ElectionProvider";
import { MessagesProvider } from "@/hooks/messages/MessagesProvider";
import { electionMockData } from "@/testing/api-mocks/ElectionMockData";
import { pollingStationMockData } from "@/testing/api-mocks/PollingStationMockData";
import { DataEntryClaimHandler, ElectionRequestHandler } from "@/testing/api-mocks/RequestHandlers";
import { validationResultMockData } from "@/testing/api-mocks/ValidationResultMockData";
import { overrideOnce, server } from "@/testing/server";
import { renderReturningRouter, screen, within } from "@/testing/test-utils";
import type { ErrorResponse } from "@/types/generated/openapi";
import { getCSOInitialValues, getDefaultDataEntryState } from "../../testing/mock-data";
import { overrideServerClaimDataEntryResponse } from "../../testing/test.utils";
import type { FormState } from "../../types/types";
import { DataEntryProvider } from "../DataEntryProvider";

function renderForm() {
  // Mock useParams to provide the sectionId
  vi.spyOn(ReactRouter, "useParams").mockReturnValue({ sectionId: "save" });

  return renderReturningRouter(
    <ElectionProvider electionId={1}>
      <MessagesProvider>
        <DataEntryProvider
          election={electionMockData}
          dataEntryId={pollingStationMockData[0]!.data_entry_id!}
          entryNumber={1}
        >
          <CheckAndSaveSection />
        </DataEntryProvider>
      </MessagesProvider>
    </ElectionProvider>,
  );
}

describe("Test CheckAndSaveSection", () => {
  beforeEach(() => {
    server.use(ElectionRequestHandler, DataEntryClaimHandler);
  });

  test("Show correction warning message when some correction warning has to be resolved", async () => {
    const formState: FormState = {
      ...getDefaultDataEntryState().formState,
      furthest: "save",
    };

    formState.sections.voters_votes_counts!.correctionWarning = validationResultMockData.W002;

    overrideServerClaimDataEntryResponse({
      formState,
      results: getCSOInitialValues(),
      validationResults: { errors: [validationResultMockData.F201], warnings: [validationResultMockData.W201] },
    });

    renderForm();
    expect(await screen.findByText("Controleren en opslaan")).toBeInTheDocument();

    expect(
      await screen.findByText(
        [
          "Je kan de resultaten van dit stembureau nog niet opslaan.",
          "Los onderstaande waarschuwingen op om verder te gaan.",
        ].join(" "),
      ),
    ).toBeVisible();

    const votersVotesSection = await screen.findByRole("region", {
      name: "Toegelaten kiezers en uitgebrachte stemmen",
    });
    expect(votersVotesSection).toBeVisible();

    expect(await within(votersVotesSection).findByRole("list")).toHaveTextContent(
      "W.002 Verschil met andere invoer. Nieuwe invoer nodig",
    );
    expect(await within(votersVotesSection).findByRole("img")).toHaveAccessibleName("bevat een waarschuwing");

    expect(screen.queryByRole("button", { name: "Opslaan" })).not.toBeInTheDocument();
  });

  test("Alert when committee session is paused is shown on save and then logs out", async () => {
    const user = userEvent.setup();
    overrideOnce("post", "/api/data_entries/1/1/finalise", 409, {
      error: "Committee session data entry is paused",
      fatal: true,
      reference: "CommitteeSessionPaused",
    } satisfies ErrorResponse);

    const router = renderForm();

    // Wait for the page to be loaded
    const title = await screen.findByText("Controleren en opslaan");
    expect(title).toBeInTheDocument();

    const submitButton = screen.getByRole("button", { name: "Opslaan" });
    await user.click(submitButton);

    const pausedModal = await screen.findByRole("dialog");
    expect(within(pausedModal).getByRole("heading", { level: 3, name: "Invoer gepauzeerd" })).toBeVisible();
    expect(within(pausedModal).getByRole("paragraph")).toHaveTextContent(
      "De coördinator heeft het invoeren van stemmen gepauzeerd. Je kan niet meer verder. [Je laatste wijzigingen worden niet opgeslagen.]",
    );
    expect(within(pausedModal).getByRole("link", { name: "Naar startscherm" })).toBeVisible();
    const logoutButton = within(pausedModal).getByRole("link", { name: "Afmelden" });
    await user.click(logoutButton);

    expect(router.state.location.pathname).toEqual("/account/logout");
  });
});
