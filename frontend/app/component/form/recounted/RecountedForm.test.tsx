import { userEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";

import { overrideOnce, render, screen } from "app/test/unit";

import {
  POLLING_STATION_DATA_ENTRY_REQUEST_BODY,
  PollingStationFormController,
} from "@kiesraad/api";
import { electionMock } from "@kiesraad/api-mocks";

import { RecountedForm } from "./RecountedForm";

const Component = (
  <PollingStationFormController election={electionMock} pollingStationId={1} entryNumber={1}>
    <RecountedForm />
  </PollingStationFormController>
);

const rootRequest: POLLING_STATION_DATA_ENTRY_REQUEST_BODY = {
  data: {
    recounted: false,
    political_group_votes: electionMock.political_groups.map((group) => ({
      number: group.number,
      total: 0,
      candidate_votes: group.candidates.map((candidate) => ({
        number: candidate.number,
        votes: 0,
      })),
    })),
    differences_counts: {
      more_ballots_count: 0,
      fewer_ballots_count: 0,
      unreturned_ballots_count: 0,
      too_few_ballots_handed_out_count: 0,
      too_many_ballots_handed_out_count: 0,
      other_explanation_count: 0,
      no_explanation_count: 0,
    },
    voters_counts: {
      poll_card_count: 0,
      proxy_certificate_count: 0,
      voter_card_count: 0,
      total_admitted_voters_count: 0,
    },
    votes_counts: {
      votes_candidates_counts: 0,
      blank_votes_count: 0,
      invalid_votes_count: 0,
      total_votes_cast_count: 0,
    },
  },
};

describe("Test RecountedForm", () => {
  afterEach(() => {
    vi.restoreAllMocks(); // ToDo: tests pass without this, so not needed?
  });

  test("hitting enter key does not result in api call", async () => {
    const spy = vi.spyOn(global, "fetch");

    const user = userEvent.setup();
    render(Component);

    const yes = screen.getByTestId("yes");
    await user.click(yes);
    expect(yes).toBeChecked();

    await user.keyboard("{enter}");

    expect(spy).not.toHaveBeenCalled();
  });

  test("Form field entry and keybindings", async () => {
    overrideOnce("post", "/api/polling_stations/1/data_entries/1", 200, {
      message: "Data saved",
      saved: true,
      validation_results: { errors: [], warnings: [] },
    });

    const user = userEvent.setup();

    render(Component);

    const yes = screen.getByTestId("yes");
    const no = screen.getByTestId("no");
    const submitButton = screen.getByRole("button", { name: "Volgende" });

    expect(yes).not.toBeChecked();
    expect(no).not.toBeChecked();

    await user.click(submitButton);

    const validationError = screen.getByText("Controleer het papieren proces-verbaal");
    expect(validationError).toBeVisible();

    await user.click(yes);
    expect(yes).toBeChecked();
    expect(no).not.toBeChecked();
    await user.click(no);
    expect(no).toBeChecked();
    expect(yes).not.toBeChecked();

    await user.click(submitButton);

    const result = await screen.findByTestId("result");
    expect(result).toHaveTextContent(/^Success$/);
  });

  describe("RecountedForm Api call", () => {
    test("RecountedForm request body is equal to the form data", async () => {
      const spy = vi.spyOn(global, "fetch");

      const expectedRequest = {
        data: {
          ...rootRequest.data,
          recounted: false,
        },
      };

      const user = userEvent.setup();

      render(Component);

      const submitButton = screen.getByRole("button", { name: "Volgende" });
      await user.click(submitButton);

      expect(spy).toHaveBeenCalledWith("http://testhost/api/polling_stations/1/data_entries/1", {
        method: "POST",
        body: JSON.stringify(expectedRequest),
        headers: {
          "Content-Type": "application/json",
        },
      });

      const result = await screen.findByTestId("result");
      expect(result).toHaveTextContent(/^Success$/);
    });
  });

  test("422 response results in display of error message", async () => {
    overrideOnce("post", "/api/polling_stations/1/data_entries/1", 422, {
      message: "422 error from mock",
    });

    const user = userEvent.setup();

    render(Component);

    const submitButton = screen.getByRole("button", { name: "Volgende" });
    await user.click(submitButton);
    const result = await screen.findByTestId("result");
    expect(result).toHaveTextContent(/^422 error from mock$/);
  });

  test("500 response results in display of error message", async () => {
    overrideOnce("post", "/api/polling_stations/1/data_entries/1", 500, {
      message: "500 error from mock",
      errorCode: "500_ERROR",
    });

    const user = userEvent.setup();

    render(Component);

    const submitButton = screen.getByRole("button", { name: "Volgende" });
    await user.click(submitButton);
    const result = await screen.findByTestId("result");
    expect(result).toHaveTextContent(/^500 error from mock$/);
  });
});
