import { userEvent } from "@testing-library/user-event";
import { beforeEach, describe, expect, test } from "vitest";

import { ElectionProvider, PollingStationResults } from "@kiesraad/api";
import {
  electionMockData,
  ElectionRequestHandler,
  PollingStationDataEntryFinaliseHandler,
  PollingStationDataEntryGetHandler,
  PollingStationDataEntrySaveHandler,
} from "@kiesraad/api-mocks";
import { renderReturningRouter, screen, server, spyOnHandler, within } from "@kiesraad/test";

import { defaultFormState, emptyDataEntryRequest, errorWarningMocks } from "../../testHelperFunctions";
import { FormState, PollingStationFormController } from "../PollingStationFormController";
import { CheckAndSaveForm } from "./CheckAndSaveForm";

const defaultValues = emptyDataEntryRequest.data;

function renderForm(defaultFormState: Partial<FormState> = {}, defaultValues?: Partial<PollingStationResults>) {
  return renderReturningRouter(
    <ElectionProvider electionId={1}>
      <PollingStationFormController
        election={electionMockData}
        pollingStationId={1}
        entryNumber={1}
        defaultFormState={defaultFormState}
        defaultValues={defaultValues}
      >
        <CheckAndSaveForm />
      </PollingStationFormController>
    </ElectionProvider>,
  );
}

describe("Test CheckAndSaveForm", () => {
  beforeEach(() => {
    server.use(
      ElectionRequestHandler,
      PollingStationDataEntryGetHandler,
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

    expect(await screen.findByRole("group", { name: "Controleren en opslaan" }));

    const user = userEvent.setup();

    await user.keyboard("{shift>}{enter}{/shift}");

    expect(finalise).toHaveBeenCalled();
  });

  test("Data entry does not show finalise button with errors", async () => {
    const formState = structuredClone(defaultFormState);
    formState.sections.voters_votes_counts.errors = [
      {
        code: "F201",
        fields: [
          "data.voters_counts.poll_card_count",
          "data.voters_counts.proxy_certificate_count",
          "data.voters_counts.voter_card_count",
          "data.voters_counts.total_admitted_voters_count",
        ],
      },
    ];

    renderForm(formState);

    // Wait for the page to be loaded and check that the save button is not visible
    expect(await screen.findByRole("group", { name: "Controleren en opslaan" }));
    expect(screen.queryByRole("button", { name: "Opslaan" })).not.toBeInTheDocument();

    expect(screen.getByTestId("section-status-voters_votes_counts")).toHaveTextContent("heeft blokkerende fouten");
  });

  test("Data entry does not show finalise button with unaccepted warnings", async () => {
    const formState = structuredClone(defaultFormState);
    formState.sections.voters_votes_counts.warnings = [
      {
        code: "W202",
        fields: ["data.voters_counts.invalid_votes_count"],
      },
    ];

    renderForm(formState);

    // Wait for the page to be loaded and check that the save button is not visible
    expect(await screen.findByRole("group", { name: "Controleren en opslaan" }));
    expect(screen.queryByRole("button", { name: "Opslaan" })).not.toBeInTheDocument();

    expect(screen.getByTestId("section-status-voters_votes_counts")).toHaveTextContent("Controleer waarschuwingen bij");
  });

  test("Data entry shows finalise button with accepted warnings", async () => {
    const formState = structuredClone(defaultFormState);
    formState.sections.voters_votes_counts.warnings = [
      {
        code: "W202",
        fields: ["data.voters_counts.invalid_votes_count"],
      },
    ];
    formState.sections.voters_votes_counts.acceptWarnings = true;

    renderForm(formState);

    // Check that the save button is visible
    expect(await screen.findByRole("button", { name: "Opslaan" })).toBeInTheDocument();
  });
});

describe("Test CheckAndSaveForm summary", () => {
  beforeEach(() => {
    server.use(ElectionRequestHandler, PollingStationDataEntryGetHandler, PollingStationDataEntrySaveHandler);
  });
  test("Blocking", async () => {
    const formState = structuredClone(defaultFormState);
    formState.sections.voters_votes_counts.errors = [errorWarningMocks.F201];
    formState.sections.differences_counts.warnings = [errorWarningMocks.W301];

    const values = structuredClone(defaultValues);

    renderForm(formState, values);

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
    const formState = structuredClone(defaultFormState);

    formState.sections.differences_counts.warnings = [errorWarningMocks.W301];
    formState.sections.differences_counts.acceptWarnings = true;

    renderForm(formState);

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
    const formState = structuredClone(defaultFormState);

    formState.sections.differences_counts.warnings = [errorWarningMocks.W301];

    renderForm(formState);

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
