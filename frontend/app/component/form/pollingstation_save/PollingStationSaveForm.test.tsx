import * as router from "react-router";

import { userEvent } from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { PollingStationSaveForm } from "app/component/form/pollingstation_save/PollingStationSaveForm.tsx";
import { overrideOnce, render, screen, server } from "app/test/unit";
import { defaultFormState } from "app/test/unit/form.ts";

import { ElectionProvider, FormState, PollingStationFormController } from "@kiesraad/api";
import { electionDetailsMockResponse, electionMockData } from "@kiesraad/api-mocks";

const mockNavigate = vi.fn();

function renderForm(defaultFormState: Partial<FormState> = {}) {
  return render(
    <ElectionProvider electionId={1}>
      <PollingStationFormController
        election={electionMockData}
        pollingStationId={1}
        entryNumber={1}
        defaultFormState={defaultFormState}
      >
        <PollingStationSaveForm />
      </PollingStationFormController>
    </ElectionProvider>,
  );
}

describe("Test PollingStationSaveForm", () => {
  beforeEach(() => {
    overrideOnce("get", "/api/elections/1", 200, electionDetailsMockResponse);
    vi.spyOn(router, "useNavigate").mockImplementation(() => mockNavigate);
  });

  test("Data entry can be finalised", async () => {
    renderForm();
    const user = userEvent.setup();

    // set up a listener to check if the finalisation request is made
    let request_method, request_url;
    overrideOnce("delete", "/api/polling_stations/1/data_entries/1/finalise", 200, null);
    server.events.on("request:start", ({ request }) => {
      request_method = request.method;
      request_url = request.url;
    });

    // click the save button
    await user.click(await screen.findByRole("button", { name: "Opslaan" }));

    // check that the finalisation request was made
    expect(request_method).toBe("POST");
    expect(request_url).toBe("http://testhost/api/polling_stations/1/data_entries/1/finalise");

    // check that the user is navigated back to the input page
    expect(mockNavigate).toHaveBeenCalledWith("/1/input#data_entry_saved");
  });

  test("Data entry does not show finalise button with errors", async () => {
    const formState = structuredClone(defaultFormState);
    formState.sections.voters_votes_counts.errors = [
      {
        code: "F201",
        fields: ["data.voters_counts.poll_card_count"],
      },
    ];

    renderForm(formState);

    // Wait for the page to be loaded and check that the save button is not visible
    expect(await screen.findByRole("heading", { level: 2, name: "Controleren en opslaan" }));
    expect(screen.queryByRole("button", { name: "Opslaan" })).not.toBeInTheDocument();
  });

  test("Data entry does not show finalise button with unaccepted warnings", async () => {
    const formState = structuredClone(defaultFormState);
    formState.sections.voters_votes_counts.warnings = [
      {
        code: "W202",
        fields: ["data.voters_counts.poll_card_count"],
      },
    ];

    renderForm(formState);

    // Wait for the page to be loaded and check that the save button is not visible
    expect(await screen.findByRole("heading", { level: 2, name: "Controleren en opslaan" }));
    expect(screen.queryByRole("button", { name: "Opslaan" })).not.toBeInTheDocument();
  });

  test("Data entry shows finalise button with accepted warnings", async () => {
    const formState = structuredClone(defaultFormState);
    formState.sections.voters_votes_counts.warnings = [
      {
        code: "W202",
        fields: ["data.voters_counts.poll_card_count"],
      },
    ];
    formState.sections.voters_votes_counts.ignoreWarnings = true;

    renderForm(formState);

    // Check that the save button is visible
    expect(await screen.findByRole("button", { name: "Opslaan" })).toBeInTheDocument();
  });
});
