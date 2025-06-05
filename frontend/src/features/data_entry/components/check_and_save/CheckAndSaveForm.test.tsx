import { userEvent } from "@testing-library/user-event";
import { beforeEach, describe, expect, test } from "vitest";

import { ElectionProvider } from "@/hooks/election/ElectionProvider";
import { electionMockData } from "@/testing/api-mocks/ElectionMockData";
import {
  ElectionRequestHandler,
  PollingStationDataEntryClaimHandler,
  PollingStationDataEntryFinaliseHandler,
  PollingStationDataEntrySaveHandler,
} from "@/testing/api-mocks/RequestHandlers";
import { server } from "@/testing/server";
import { renderReturningRouter, screen, spyOnHandler, within } from "@/testing/test-utils";

import { errorWarningMocks, getDefaultFormSection, getEmptyDataEntryRequest } from "../../testing/mock-data";
import { overrideServerClaimDataEntryResponse } from "../../testing/test.utils";
import { DataEntryState, FormState } from "../../types/types";
import { ValidationResultSet } from "../../utils/ValidationResults";
import { DataEntryProvider } from "../DataEntryProvider";
import { CheckAndSaveForm } from "./CheckAndSaveForm";

function getDefaultValues() {
  return getEmptyDataEntryRequest().data;
}

function getDefaultDataEntryState(): DataEntryState {
  return {
    election: electionMockData,
    pollingStationId: 1,
    error: null,
    pollingStationResults: null,
    entryNumber: 1,
    formState: {
      current: "save",
      furthest: "save",
      sections: {
        recounted: getDefaultFormSection("recounted", 1),
        voters_votes_counts: getDefaultFormSection("voters_votes_counts", 2),
        differences_counts: getDefaultFormSection("differences_counts", 3),
        save: getDefaultFormSection("save", 4),
      },
    },
    targetFormSectionId: "recounted",
    status: "idle",
    cache: null,
  };
}

function renderForm() {
  return renderReturningRouter(
    <ElectionProvider electionId={1}>
      <DataEntryProvider election={electionMockData} pollingStationId={1} entryNumber={1}>
        <CheckAndSaveForm />
      </DataEntryProvider>
    </ElectionProvider>,
  );
}

describe("Test CheckAndSaveForm", () => {
  beforeEach(() => {
    server.use(
      ElectionRequestHandler,
      PollingStationDataEntryClaimHandler,
      PollingStationDataEntrySaveHandler,
      PollingStationDataEntryFinaliseHandler,
    );
  });

  test("Data entry can be finalised", async () => {
    const router = renderForm();
    const user = userEvent.setup();

    // set up a listener to check if the finalisation request is made
    const finalise = spyOnHandler(PollingStationDataEntryFinaliseHandler);

    // click the save button
    await user.click(await screen.findByRole("button", { name: "Opslaan" }));

    // check that the finalisation request was made
    expect(finalise).toHaveBeenCalledOnce();

    // check that the user is navigated back to the data entry page
    expect(router.state.location.pathname).toEqual("/elections/1/data-entry");
    expect(router.state.location.hash).toEqual("#data-entry-saved-1");
  });

  test("Shift+Enter submits form", async () => {
    renderForm();
    const finalise = spyOnHandler(PollingStationDataEntryFinaliseHandler);

    expect(await screen.findByRole("group", { name: "Controleren en opslaan" })).toBeVisible();

    const user = userEvent.setup();

    await user.keyboard("{shift>}{enter}{/shift}");

    expect(finalise).toHaveBeenCalled();
  });

  test("Data entry does not show finalise button with errors", async () => {
    overrideServerClaimDataEntryResponse({
      formState: getDefaultDataEntryState().formState,
      pollingStationResults: getDefaultValues(),
      validationResults: { errors: [errorWarningMocks.F201], warnings: [] },
    });
    renderForm();

    // Wait for the page to be loaded and check that the save button is not visible
    expect(await screen.findByRole("group", { name: "Controleren en opslaan" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Opslaan" })).not.toBeInTheDocument();

    expect(screen.getByTestId("section-status-voters_votes_counts")).toHaveTextContent("heeft blokkerende fouten");
  });

  test("Data entry does not show finalise button with unaccepted warnings", async () => {
    overrideServerClaimDataEntryResponse({
      formState: getDefaultDataEntryState().formState,
      pollingStationResults: getDefaultValues(),
      validationResults: { errors: [], warnings: [errorWarningMocks.W202] },
    });
    renderForm();

    // Wait for the page to be loaded and check that the save button is not visible
    expect(await screen.findByRole("group", { name: "Controleren en opslaan" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Opslaan" })).not.toBeInTheDocument();

    expect(screen.getByTestId("section-status-voters_votes_counts")).toHaveTextContent("Controleer waarschuwingen bij");
  });

  test("Data entry shows finalise button with accepted warnings", async () => {
    const dataEntryState = getDefaultDataEntryState();
    dataEntryState.formState.sections.voters_votes_counts.acceptErrorsAndWarnings = true;

    overrideServerClaimDataEntryResponse({
      formState: dataEntryState.formState,
      pollingStationResults: getDefaultValues(),
      validationResults: { errors: [], warnings: [errorWarningMocks.W202] },
    });
    renderForm();

    // Check that the save button is visible
    expect(await screen.findByRole("button", { name: "Opslaan" })).toBeInTheDocument();
  });

  test("Save Form renders errors and warnings list when accepted errors", async () => {
    const defaultState = getDefaultDataEntryState().formState;
    const mockFormState: FormState = {
      ...defaultState,
      sections: {
        ...defaultState.sections,
        voters_votes_counts: {
          ...defaultState.sections.voters_votes_counts,
          errors: new ValidationResultSet([errorWarningMocks.F201]),
          warnings: new ValidationResultSet([errorWarningMocks.W203]),
          acceptErrorsAndWarnings: true,
        },
      },
    };

    overrideServerClaimDataEntryResponse({
      formState: mockFormState,
      pollingStationResults: getDefaultValues(),
      validationResults: { errors: [errorWarningMocks.F201], warnings: [] },
    });
    renderForm();

    expect(await screen.findByRole("button", { name: "Afronden" })).toBeInTheDocument();
  });
});

describe("Test CheckAndSaveForm summary", () => {
  beforeEach(() => {
    server.use(ElectionRequestHandler, PollingStationDataEntryClaimHandler, PollingStationDataEntrySaveHandler);
  });
  test("Blocking", async () => {
    const values = getDefaultValues();

    overrideServerClaimDataEntryResponse({
      formState: getDefaultDataEntryState().formState,
      pollingStationResults: values,
      validationResults: { errors: [errorWarningMocks.F201], warnings: [errorWarningMocks.W301] },
    });
    renderForm();

    expect(
      await screen.findByText(
        "De aantallen die je hebt ingevoerd in de verschillende stappen spreken elkaar tegen. Je kan de resultaten daarom niet opslaan.",
      ),
    ).toBeInTheDocument();

    const votersItem = screen.getByTestId("section-status-voters_votes_counts");
    expect(votersItem).toHaveTextContent("heeft blokkerende fouten");
    expect(within(votersItem).getByRole("img", { name: "bevat een fout" })).toBeInTheDocument();

    const differencesItem = screen.getByTestId("section-status-differences_counts");
    expect(differencesItem).toHaveTextContent("Controleer waarschuwingen bij");
    expect(within(differencesItem).getByRole("img", { name: "bevat een waarschuwing" })).toBeInTheDocument();

    expect(screen.getByTestId("form-cannot-be-saved")).toBeInTheDocument();
  });

  test("Accepted with warnings", async () => {
    const dataEntryState = getDefaultDataEntryState();
    dataEntryState.formState.sections.differences_counts.acceptErrorsAndWarnings = true;
    overrideServerClaimDataEntryResponse({
      formState: dataEntryState.formState,
      pollingStationResults: getDefaultValues(),
      validationResults: { errors: [], warnings: [errorWarningMocks.W301] },
    });
    renderForm();

    expect(
      await screen.findByText(
        "De aantallen die je hebt ingevoerd in de verschillende stappen spreken elkaar niet tegen. Er zijn geen blokkerende fouten of waarschuwingen.",
      ),
    ).toBeInTheDocument();

    const differencesItem = screen.getByTestId("section-status-differences_counts");
    expect(differencesItem).toHaveTextContent("heeft geaccepteerde waarschuwingen");
    expect(within(differencesItem).getByRole("img", { name: "opgeslagen" })).toBeInTheDocument();
  });

  test("Unaccepted warnings", async () => {
    overrideServerClaimDataEntryResponse({
      formState: getDefaultDataEntryState().formState,
      pollingStationResults: getDefaultValues(),
      validationResults: { errors: [], warnings: [errorWarningMocks.W301] },
    });
    renderForm();

    expect(
      await screen.findByText(
        "De aantallen die je hebt ingevoerd in de verschillende stappen spreken elkaar niet tegen. Er zijn waarschuwingen die moeten worden gecontroleerd.",
      ),
    ).toBeInTheDocument();

    const differencesItem = screen.getByTestId("section-status-differences_counts");
    expect(differencesItem).toHaveTextContent("Controleer waarschuwingen bij");
    expect(within(differencesItem).getByRole("img", { name: "bevat een waarschuwing" })).toBeInTheDocument();
  });
});
