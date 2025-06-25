import { userEvent } from "@testing-library/user-event";
import { beforeEach, describe, expect, test } from "vitest";

import { ElectionProvider } from "@/hooks/election/ElectionProvider";
import { entriesDifferentStatus, firstEntryHasErrorsStatus } from "@/testing/api-mocks/DataEntryMockData";
import { electionMockData } from "@/testing/api-mocks/ElectionMockData";
import {
  ElectionRequestHandler,
  PollingStationDataEntryClaimHandler,
  PollingStationDataEntryFinaliseHandler,
  PollingStationDataEntrySaveHandler,
} from "@/testing/api-mocks/RequestHandlers";
import { validationResultMockData } from "@/testing/api-mocks/ValidationResultMockData";
import { overrideOnce, server } from "@/testing/server";
import { renderReturningRouter, screen, spyOnHandler, within } from "@/testing/test-utils";
import { ValidationResultSet } from "@/utils/ValidationResults";

import { getDefaultDataEntryState, getEmptyDataEntryRequest, getInitialValues } from "../../testing/mock-data";
import { overrideServerClaimDataEntryResponse } from "../../testing/test.utils";
import { FormState } from "../../types/types";
import { DataEntryProvider } from "../DataEntryProvider";
import { CheckAndSaveForm } from "./CheckAndSaveForm";

function customFormState(): FormState {
  return {
    ...getDefaultDataEntryState().formState,
    current: "save",
    furthest: "save",
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

  test("Data entry can be finalised and check redirect", async () => {
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
    expect(router.state.location.hash).toEqual("#data-entry-1-saved");
  });

  test("Check redirect when finalising data entry that is different", async () => {
    const router = renderForm();
    const user = userEvent.setup();

    // set up a listener to check if the finalisation request is made
    const finalise = spyOnHandler(PollingStationDataEntryFinaliseHandler);
    overrideOnce("post", "/api/polling_stations/1/data_entries/1/finalise", 200, entriesDifferentStatus);

    // click the save button
    await user.click(await screen.findByRole("button", { name: "Opslaan" }));

    // check that the finalisation request was made
    expect(finalise).toHaveBeenCalledOnce();

    // check that the user is navigated back to the data entry page
    expect(router.state.location.pathname).toEqual("/elections/1/data-entry");
    expect(router.state.location.hash).toEqual("#data-entry-different");
  });

  test("Check redirect when finalising data entry with errors", async () => {
    const router = renderForm();
    const user = userEvent.setup();

    // set up a listener to check if the finalisation request is made
    const finalise = spyOnHandler(PollingStationDataEntryFinaliseHandler);
    overrideOnce("post", "/api/polling_stations/1/data_entries/1/finalise", 200, firstEntryHasErrorsStatus);

    // click the save button
    await user.click(await screen.findByRole("button", { name: "Opslaan" }));

    // check that the finalisation request was made
    expect(finalise).toHaveBeenCalledOnce();

    // check that the user is navigated back to the data entry page
    expect(router.state.location.pathname).toEqual("/elections/1/data-entry");
    expect(router.state.location.hash).toEqual("#data-entry-errors");
  });

  test("Shift+Enter submits form", async () => {
    renderForm();
    const finalise = spyOnHandler(PollingStationDataEntryFinaliseHandler);

    expect(await screen.findByRole("group", { name: "Controleren en opslaan" })).toBeVisible();

    const user = userEvent.setup();

    await user.keyboard("{shift>}{enter}{/shift}");

    expect(finalise).toHaveBeenCalledOnce();
  });

  test("Data entry does not show finalise button with errors", async () => {
    overrideServerClaimDataEntryResponse({
      formState: customFormState(),
      pollingStationResults: getInitialValues(),
      validationResults: { errors: [validationResultMockData.F201], warnings: [] },
    });
    renderForm();

    // Wait for the page to be loaded and check that the save button is not visible
    expect(await screen.findByRole("group", { name: "Controleren en opslaan" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Opslaan" })).not.toBeInTheDocument();

    expect(screen.getByTestId("section-status-voters_votes_counts")).toHaveTextContent("heeft blokkerende fouten");
  });

  test("Data entry does not show finalise button with unaccepted warnings", async () => {
    overrideServerClaimDataEntryResponse({
      formState: customFormState(),
      pollingStationResults: getInitialValues(),
      validationResults: { errors: [], warnings: [validationResultMockData.W202] },
    });
    renderForm();

    // Wait for the page to be loaded and check that the save button is not visible
    expect(await screen.findByRole("group", { name: "Controleren en opslaan" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Opslaan" })).not.toBeInTheDocument();

    expect(screen.getByTestId("section-status-voters_votes_counts")).toHaveTextContent("Controleer waarschuwingen bij");
  });

  test("Data entry shows finalise button with accepted warnings", async () => {
    const formState = customFormState();
    formState.sections.voters_votes_counts.acceptErrorsAndWarnings = true;

    overrideServerClaimDataEntryResponse({
      formState: formState,
      pollingStationResults: getInitialValues(),
      validationResults: { errors: [], warnings: [validationResultMockData.W202] },
    });
    renderForm();

    // Check that the save button is visible
    expect(await screen.findByRole("button", { name: "Opslaan" })).toBeInTheDocument();
  });

  test("Save Form renders errors and warnings list when accepted errors", async () => {
    const defaultState = customFormState();
    const mockFormState: FormState = {
      ...defaultState,
      sections: {
        ...defaultState.sections,
        voters_votes_counts: {
          ...defaultState.sections.voters_votes_counts,
          errors: new ValidationResultSet([validationResultMockData.F201]),
          warnings: new ValidationResultSet([validationResultMockData.W203]),
          acceptErrorsAndWarnings: true,
        },
      },
    };

    overrideServerClaimDataEntryResponse({
      formState: mockFormState,
      pollingStationResults: getInitialValues(),
      validationResults: { errors: [validationResultMockData.F201], warnings: [validationResultMockData.W203] },
    });
    renderForm();

    expect(await screen.findByRole("button", { name: "Afronden" })).toBeInTheDocument();

    const summaryList = screen.findByTestId(`save-form-summary-list-voters_votes_counts`);

    expect(summaryList).toBeDefined();
    expect(within(await summaryList).getByText("Controleer toegelaten kiezers")).toBeInTheDocument();
    expect(
      within(await summaryList).getByText("Controleer aantal toegelaten kiezers en aantal uitgebrachte stemmen"),
    ).toBeInTheDocument();
  });

  test("Can't complete data entry without accepting errors", async () => {
    const defaultState = customFormState();
    const mockFormState: FormState = {
      ...defaultState,
      sections: {
        ...defaultState.sections,
        voters_votes_counts: {
          ...defaultState.sections.voters_votes_counts,
          errors: new ValidationResultSet([validationResultMockData.F201]),
          warnings: new ValidationResultSet([validationResultMockData.W203]),
          acceptErrorsAndWarnings: true,
        },
      },
    };

    const defaultValues = getEmptyDataEntryRequest().data;
    overrideServerClaimDataEntryResponse({
      formState: mockFormState,
      pollingStationResults: defaultValues,
      validationResults: { errors: [validationResultMockData.F201], warnings: [validationResultMockData.W203] },
    });
    renderForm();

    const completeButton = await screen.findByRole("button", { name: "Afronden" });
    expect(completeButton).toBeInTheDocument();

    const acceptErrorsCheckbox = screen.getByRole("checkbox", {
      name: "Ik heb de fouten besproken met de coördinator",
    });
    expect(acceptErrorsCheckbox).toBeInTheDocument();

    await userEvent.click(completeButton);

    const errorMessage = await screen.findByRole("alert");
    expect(errorMessage).toHaveTextContent("Je kan alleen verder als je dit met de coördinator hebt overlegd.");

    await userEvent.click(acceptErrorsCheckbox);

    expect(acceptErrorsCheckbox).toBeChecked();
    const finalise = spyOnHandler(PollingStationDataEntryFinaliseHandler);

    await userEvent.click(completeButton);

    expect(finalise).toHaveBeenCalledOnce();
  });
});

describe("Test CheckAndSaveForm summary", () => {
  beforeEach(() => {
    server.use(ElectionRequestHandler, PollingStationDataEntryClaimHandler, PollingStationDataEntrySaveHandler);
  });
  test("Blocking", async () => {
    overrideServerClaimDataEntryResponse({
      formState: customFormState(),
      pollingStationResults: getInitialValues(),
      validationResults: { errors: [validationResultMockData.F201], warnings: [validationResultMockData.W301] },
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
    const formState = customFormState();
    formState.sections.differences_counts.acceptErrorsAndWarnings = true;
    overrideServerClaimDataEntryResponse({
      formState: formState,
      pollingStationResults: getInitialValues(),
      validationResults: { errors: [], warnings: [validationResultMockData.W301] },
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
      formState: customFormState(),
      pollingStationResults: getEmptyDataEntryRequest().data,
      validationResults: { errors: [], warnings: [validationResultMockData.W301] },
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
