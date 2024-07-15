/**
 * @vitest-environment jsdom
 */

import { overrideOnce, render, screen, getUrlMethodAndBody } from "app/test/unit";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, test, vi, afterEach } from "vitest";

import {
  POLLING_STATION_DATA_ENTRY_REQUEST_BODY,
  PollingStationFormController,
} from "@kiesraad/api";
import { electionMock } from "@kiesraad/api-mocks";
import { DifferencesForm } from "./DifferencesForm";

const Component = (
  <PollingStationFormController election={electionMock} pollingStationId={1} entryNumber={1}>
    <DifferencesForm />
  </PollingStationFormController>
);

const rootRequest: POLLING_STATION_DATA_ENTRY_REQUEST_BODY = {
  data: {
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

describe("Test DifferencesForm", () => {
  afterEach(() => {
    vi.restoreAllMocks(); // ToDo: tests pass without this, so not needed?
  });

  test("hitting enter key does not result in api call", async () => {
    const spy = vi.spyOn(global, "fetch");

    const user = userEvent.setup();

    render(Component);

    const moreBallotsCount = screen.getByTestId("more_ballots_count");
    await user.type(moreBallotsCount, "12345");
    expect(moreBallotsCount).toHaveValue("12.345");

    await user.keyboard("{enter}");

    expect(spy).not.toHaveBeenCalled();
  });

  test("Form field entry and keybindings", async () => {
    overrideOnce("post", "/v1/api/polling_stations/1/data_entries/1", 200, {
      message: "Data saved",
      saved: true,
      validation_results: { errors: [], warnings: [] },
    });

    const user = userEvent.setup();

    render(Component);

    const moreBallotsCount = screen.getByTestId("more_ballots_count");
    expect(moreBallotsCount).toHaveFocus();
    await user.type(moreBallotsCount, "12345");
    expect(moreBallotsCount).toHaveValue("12.345");

    await user.keyboard("{enter}");

    const fewerBallotsCount = screen.getByTestId("fewer_ballots_count");
    expect(fewerBallotsCount).toHaveFocus();
    await user.paste("6789");
    expect(fewerBallotsCount).toHaveValue("6.789");

    await user.keyboard("{enter}");

    const unreturnedBallotsCount = screen.getByTestId("unreturned_ballots_count");
    expect(unreturnedBallotsCount).toHaveFocus();
    await user.type(unreturnedBallotsCount, "123");
    expect(unreturnedBallotsCount).toHaveValue("123");

    await user.keyboard("{enter}");

    const tooFewBallotsHandedOutCount = screen.getByTestId("too_few_ballots_handed_out_count");
    expect(tooFewBallotsHandedOutCount).toHaveFocus();
    await user.paste("4242");
    expect(tooFewBallotsHandedOutCount).toHaveValue("4.242");

    await user.keyboard("{enter}");

    const tooManyBallotsHandedOutCount = screen.getByTestId("too_many_ballots_handed_out_count");
    expect(tooManyBallotsHandedOutCount).toHaveFocus();
    await user.type(tooManyBallotsHandedOutCount, "12");
    expect(tooManyBallotsHandedOutCount).toHaveValue("12");

    await user.keyboard("{enter}");

    const otherExplanationCount = screen.getByTestId("other_explanation_count");
    expect(otherExplanationCount).toHaveFocus();
    // Test if maxLength on field works
    await user.type(otherExplanationCount, "1000000000");
    expect(otherExplanationCount).toHaveValue("100.000.000");

    await user.keyboard("{enter}");

    const noExplanationCount = screen.getByTestId("no_explanation_count");
    expect(noExplanationCount).toHaveFocus();
    await user.type(noExplanationCount, "3");
    expect(noExplanationCount).toHaveValue("3");

    await user.keyboard("{enter}");

    const submitButton = screen.getByRole("button", { name: "Volgende" });
    await user.click(submitButton);

    const result = await screen.findByTestId("result");
    expect(result).toHaveTextContent(/^Success$/);
  });

  describe("DifferencesForm Api call", () => {
    test("DifferencesForm request body is equal to the form data", async () => {
      const spy = vi.spyOn(global, "fetch");

      const expectedRequest = {
        data: {
          ...rootRequest.data,
          differences_counts: {
            more_ballots_count: 2,
            fewer_ballots_count: 0,
            unreturned_ballots_count: 0,
            too_few_ballots_handed_out_count: 0,
            too_many_ballots_handed_out_count: 1,
            other_explanation_count: 0,
            no_explanation_count: 1,
          },
        },
      };

      const user = userEvent.setup();

      render(Component);

      await user.type(
        screen.getByTestId("more_ballots_count"),
        expectedRequest.data.differences_counts.more_ballots_count.toString(),
      );
      await user.type(
        screen.getByTestId("fewer_ballots_count"),
        expectedRequest.data.differences_counts.fewer_ballots_count.toString(),
      );
      await user.type(
        screen.getByTestId("unreturned_ballots_count"),
        expectedRequest.data.differences_counts.unreturned_ballots_count.toString(),
      );
      await user.type(
        screen.getByTestId("too_few_ballots_handed_out_count"),
        expectedRequest.data.differences_counts.too_few_ballots_handed_out_count.toString(),
      );
      await user.type(
        screen.getByTestId("too_many_ballots_handed_out_count"),
        expectedRequest.data.differences_counts.too_many_ballots_handed_out_count.toString(),
      );
      await user.type(
        screen.getByTestId("other_explanation_count"),
        expectedRequest.data.differences_counts.other_explanation_count.toString(),
      );
      await user.type(
        screen.getByTestId("no_explanation_count"),
        expectedRequest.data.differences_counts.no_explanation_count.toString(),
      );

      const submitButton = screen.getByRole("button", { name: "Volgende" });
      await user.click(submitButton);

      expect(spy).toHaveBeenCalled();
      const { url, method, body } = getUrlMethodAndBody(spy.mock.calls);
      expect(url).toEqual("http://testhost/v1/api/polling_stations/1/data_entries/1");
      expect(method).toEqual("POST");
      expect(body).toEqual(expectedRequest);

      const result = await screen.findByTestId("result");
      expect(result).toHaveTextContent(/^Success$/);
    });
  });

  test("422 response results in display of error message", async () => {
    overrideOnce("post", "/v1/api/polling_stations/1/data_entries/1", 422, {
      message: "422 error from mock",
    });

    const user = userEvent.setup();

    render(Component);

    const submitButton = screen.getByRole("button", { name: "Volgende" });
    await user.click(submitButton);
    const result = await screen.findByTestId("feedback-server-error");
    expect(result).toHaveTextContent(/^Error422 error from mock$/);
  });

  test("500 response results in display of error message", async () => {
    overrideOnce("post", "/v1/api/polling_stations/1/data_entries/1", 500, {
      message: "500 error from mock",
    });

    const user = userEvent.setup();

    render(Component);

    const submitButton = screen.getByRole("button", { name: "Volgende" });
    await user.click(submitButton);
    const result = await screen.findByTestId("feedback-server-error");
    expect(result).toHaveTextContent(/^Error500 error from mock$/);
  });

  // TODO: Add validation test once backend validation is implemented
  test.skip("Incorrect total is caught by validation", async () => {
    const user = userEvent.setup();

    render(Component);

    await user.type(screen.getByTestId("more_ballots_count"), "2");
    await user.type(screen.getByTestId("fewer_ballots_count"), "0");
    await user.type(screen.getByTestId("unreturned_ballots_count"), "0");
    await user.type(screen.getByTestId("too_few_ballots_handed_out_count"), "0");
    await user.type(screen.getByTestId("too_many_ballots_handed_out_count"), "1");
    await user.type(screen.getByTestId("other_explanation_count"), "0");
    await user.type(screen.getByTestId("no_explanation_count"), "1");

    const submitButton = screen.getByRole("button", { name: "Volgende" });
    await user.click(submitButton);

    const result = await screen.findByTestId("feedback-error");
    expect(result).toHaveTextContent(/^IncorrectTotal,IncorrectTotal$/);
  });
});
