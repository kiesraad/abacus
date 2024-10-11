import * as router from "react-router";

import { userEvent } from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { CheckAndSaveForm } from "app/component/form/data_entry/check_and_save/CheckAndSaveForm";
import { overrideOnce, render, screen, server, within } from "app/test/unit";
import { defaultFormState, emptyDataEntryRequest, errorWarningMocks } from "app/test/unit/form";

import { ElectionProvider, FormState, PollingStationFormController, PollingStationResults } from "@kiesraad/api";
import { electionDetailsMockResponse, electionMockData } from "@kiesraad/api-mocks";

const mockNavigate = vi.fn();

const defaultValues = emptyDataEntryRequest.data;

function renderForm(defaultFormState: Partial<FormState> = {}, defaultValues?: Partial<PollingStationResults>) {
  return render(
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
    overrideOnce("get", "/api/elections/1", 200, electionDetailsMockResponse);
    vi.spyOn(router, "useNavigate").mockImplementation(() => mockNavigate);
  });

  test("Data entry can be finalised", async () => {
    renderForm();
    const user = userEvent.setup();

    // set up a listener to check if the finalisation request is made
    let request_method, request_url;
    overrideOnce("post", "/api/polling_stations/1/data_entries/1/finalise", 200, null);
    server.events.on("request:start", ({ request }) => {
      request_method = request.method;
      request_url = request.url;
    });

    // click the save button
    await user.click(await screen.findByRole("button", { name: "Opslaan" }));

    // check that the finalisation request was made
    expect(request_method).toBe("POST");
    expect(request_url).toBe("http://localhost:3000/api/polling_stations/1/data_entries/1/finalise");

    // check that the user is navigated back to the data entry page
    expect(mockNavigate).toHaveBeenCalledWith("/elections/1/data-entry#data-entry-saved");
  });

  test("Shift+Enter submits form", async () => {
    renderForm();

    const formTitle = await screen.findByRole("heading", { level: 2, name: "Controleren en opslaan" });
    expect(formTitle).toHaveFocus();

    overrideOnce("post", "/api/polling_stations/1/data_entries/1/finalise", 200, null);

    const user = userEvent.setup();
    const spy = vi.spyOn(global, "fetch");

    await user.keyboard("{shift>}{enter}{/shift}");

    expect(spy).toHaveBeenCalled();
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
    expect(await screen.findByRole("heading", { level: 2, name: "Controleren en opslaan" }));
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
    expect(await screen.findByRole("heading", { level: 2, name: "Controleren en opslaan" }));
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

    const pg1Item = screen.getByTestId("section-status-political_group_votes_1");
    expect(pg1Item).toHaveTextContent("Op Lijst 1 zijn geen stemmen ingevoerd");
    expect(within(pg1Item).getByRole("img", { name: "leeg" })).toBeInTheDocument();

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
    expect(within(differencesItem).getByRole("img", { name: "bevat een waarschuwing" })).toBeInTheDocument();
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
