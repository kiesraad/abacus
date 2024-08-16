/**
 * @vitest-environment jsdom
 */
import { userEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";

import { getUrlMethodAndBody, overrideOnce, render, screen, userTypeInputs } from "app/test/unit";

import {
  POLLING_STATION_DATA_ENTRY_REQUEST_BODY,
  PollingStationFormController,
  PollingStationValues,
} from "@kiesraad/api";
import { electionMock, pollingStationMock } from "@kiesraad/api-mocks";

import { DifferencesForm } from "./DifferencesForm";

function renderForm(defaultValues: Partial<PollingStationValues> = {}) {
  return render(
    <PollingStationFormController
      election={electionMock}
      pollingStationId={pollingStationMock.id}
      entryNumber={1}
      defaultValues={defaultValues}
    >
      <DifferencesForm />
    </PollingStationFormController>,
  );
}

const rootRequest: POLLING_STATION_DATA_ENTRY_REQUEST_BODY = {
  data: {
    recounted: false,
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
    voters_recounts: undefined,
    differences_counts: {
      more_ballots_count: 0,
      fewer_ballots_count: 0,
      unreturned_ballots_count: 0,
      too_few_ballots_handed_out_count: 0,
      too_many_ballots_handed_out_count: 0,
      other_explanation_count: 0,
      no_explanation_count: 0,
    },
    political_group_votes: electionMock.political_groups.map((group) => ({
      number: group.number,
      total: 0,
      candidate_votes: group.candidates.map((candidate) => ({
        number: candidate.number,
        votes: 0,
      })),
    })),
  },
};

describe("Test DifferencesForm", () => {
  afterEach(() => {
    vi.restoreAllMocks(); // ToDo: tests pass without this, so not needed?
  });

  describe("DifferencesForm user interactions", () => {
    test("hitting enter key does not result in api call", async () => {
      const user = userEvent.setup();

      renderForm();
      const spy = vi.spyOn(global, "fetch");

      const moreBallotsCount = await screen.findByTestId("more_ballots_count");
      await user.type(moreBallotsCount, "12345");
      expect(moreBallotsCount).toHaveValue("12.345");

      await user.keyboard("{enter}");

      expect(spy).not.toHaveBeenCalled();
    });

    test("Form field entry and keybindings", async () => {
      overrideOnce("post", "/api/polling_stations/1/data_entries/1", 200, {
        validation_results: { errors: [], warnings: [] },
      });

      const user = userEvent.setup();

      renderForm();

      const moreBallotsCount = await screen.findByTestId("more_ballots_count");
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
  });

  describe("DifferencesForm API request and response", () => {
    test("DifferencesForm request body is equal to the form data", async () => {
      const votersAndVotesValues = {
        voters_counts: {
          poll_card_count: 50,
          proxy_certificate_count: 1,
          voter_card_count: 2,
          total_admitted_voters_count: 53,
        },
        votes_counts: {
          votes_candidates_counts: 52,
          blank_votes_count: 1,
          invalid_votes_count: 2,
          total_votes_cast_count: 55,
        },
      };

      const expectedRequest = {
        data: {
          ...rootRequest.data,
          ...votersAndVotesValues,
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

      renderForm({ ...votersAndVotesValues });
      const spy = vi.spyOn(global, "fetch");

      await userTypeInputs(user, {
        ...expectedRequest.data.differences_counts,
      });

      const submitButton = screen.getByRole("button", { name: "Volgende" });
      await user.click(submitButton);

      expect(spy).toHaveBeenCalled();
      const { url, method, body } = getUrlMethodAndBody(spy.mock.calls);
      expect(url).toEqual("http://testhost/api/polling_stations/1/data_entries/1");
      expect(method).toEqual("POST");
      expect(body).toEqual(expectedRequest);

      const result = await screen.findByTestId("result");
      expect(result).toHaveTextContent(/^Success$/);
    });

    test("422 response results in display of error message", async () => {
      overrideOnce("post", "/api/polling_stations/1/data_entries/1", 422, {
        message: "422 error from mock",
      });

      const user = userEvent.setup();

      renderForm();

      const submitButton = await screen.findByRole("button", { name: "Volgende" });
      await user.click(submitButton);
      const feedbackServerError = await screen.findByTestId("feedback-server-error");
      expect(feedbackServerError).toHaveTextContent(/^Error422 error from mock$/);
    });

    test("500 response results in display of error message", async () => {
      overrideOnce("post", "/api/polling_stations/1/data_entries/1", 500, {
        message: "500 error from mock",
      });

      const user = userEvent.setup();

      renderForm();

      const submitButton = await screen.findByRole("button", { name: "Volgende" });
      await user.click(submitButton);
      const feedbackServerError = await screen.findByTestId("feedback-server-error");
      expect(feedbackServerError).toHaveTextContent(/^Error500 error from mock$/);
    });
  });

  describe("DifferencesForm errors", () => {
    test("F.301 IncorrectDifference", async () => {
      overrideOnce("post", "/api/polling_stations/1/data_entries/1", 200, {
        validation_results: {
          errors: [
            {
              fields: ["data.differences_counts.more_ballots_count"],
              code: "F301",
            },
          ],
          warnings: [],
        },
      });

      const user = userEvent.setup();

      renderForm({ recounted: false });

      // Since the component does not allow to change values in other components,
      // not inputting any values and just clicking the submit button.
      const submitButton = screen.getByRole("button", { name: "Volgende" });
      await user.click(submitButton);

      const feedbackError = await screen.findByTestId("feedback-error");
      expect(feedbackError).toHaveTextContent(/^F301$/);
      expect(screen.queryByTestId("feedback-warning")).toBeNull();
      expect(screen.queryByTestId("server-feedback-error")).toBeNull();
    });

    test("F.302 IncorrectDifference", async () => {
      overrideOnce("post", "/api/polling_stations/1/data_entries/1", 200, {
        validation_results: {
          errors: [
            {
              fields: ["data.differences_counts.more_ballots_count"],
              code: "F302",
            },
          ],
          warnings: [],
        },
      });

      const user = userEvent.setup();

      renderForm({ recounted: true });

      // Since the component does not allow to change values in other components,
      // not inputting any values and just clicking the submit button.
      const submitButton = screen.getByRole("button", { name: "Volgende" });
      await user.click(submitButton);

      const feedbackError = await screen.findByTestId("feedback-error");
      expect(feedbackError).toHaveTextContent(/^F302$/);
      expect(screen.queryByTestId("feedback-warning")).toBeNull();
      expect(screen.queryByTestId("server-feedback-error")).toBeNull();
    });

    test("F.303 IncorrectDifference", async () => {
      overrideOnce("post", "/api/polling_stations/1/data_entries/1", 200, {
        validation_results: {
          errors: [
            {
              fields: ["data.differences_counts.fewer_ballots_count"],
              code: "F303",
            },
          ],
          warnings: [],
        },
      });

      const user = userEvent.setup();

      renderForm({ recounted: false });

      // Since the component does not allow to change values in other components,
      // not inputting any values and just clicking the submit button.
      const submitButton = screen.getByRole("button", { name: "Volgende" });
      await user.click(submitButton);

      const feedbackError = await screen.findByTestId("feedback-error");
      expect(feedbackError).toHaveTextContent(/^F303$/);
      expect(screen.queryByTestId("feedback-warning")).toBeNull();
      expect(screen.queryByTestId("server-feedback-error")).toBeNull();
    });

    test("F.304 IncorrectDifference", async () => {
      overrideOnce("post", "/api/polling_stations/1/data_entries/1", 200, {
        validation_results: {
          errors: [
            {
              fields: ["data.differences_counts.fewer_ballots_count"],
              code: "F304",
            },
          ],
          warnings: [],
        },
      });

      const user = userEvent.setup();

      renderForm({ recounted: true });

      // Since the component does not allow to change values in other components,
      // not inputting any values and just clicking the submit button.
      const submitButton = screen.getByRole("button", { name: "Volgende" });
      await user.click(submitButton);

      const feedbackError = await screen.findByTestId("feedback-error");
      expect(feedbackError).toHaveTextContent(/^F304$/);
      expect(screen.queryByTestId("feedback-warning")).toBeNull();
      expect(screen.queryByTestId("server-feedback-error")).toBeNull();
    });
  });

  describe("DifferencesForm warnings", () => {
    test("W.301 ConflictingDifferences", async () => {
      overrideOnce("post", "/api/polling_stations/1/data_entries/1", 200, {
        validation_results: {
          errors: [
            {
              fields: [
                "data.differences_counts.more_ballots_count",
                "data.differences_counts.fewer_ballots_count",
              ],
              code: "W301",
            },
          ],
          warnings: [],
        },
      });

      const user = userEvent.setup();

      renderForm();

      // Since the component does not allow to change values in other components,
      // not inputting any values and just clicking the submit button.
      const submitButton = screen.getByRole("button", { name: "Volgende" });
      await user.click(submitButton);

      const feedbackError = await screen.findByTestId("feedback-error");
      expect(feedbackError).toHaveTextContent(/^W301$/);
      expect(screen.queryByTestId("feedback-warning")).toBeNull();
      expect(screen.queryByTestId("server-feedback-error")).toBeNull();
    });

    test("W.302 Incorrect total", async () => {
      overrideOnce("post", "/api/polling_stations/1/data_entries/1", 200, {
        validation_results: {
          errors: [],
          warnings: [
            {
              fields: [
                "data.differences_counts.more_ballots_count",
                "data.differences_counts.too_many_ballots_handed_out_count",
                "data.differences_counts.too_few_ballots_handed_out_count",
                "data.differences_counts.unreturned_ballots",
                "data.differences_counts.other_explanation_count",
                "data.differences_counts.no_explanation_count",
              ],
              code: "W302",
            },
          ],
        },
      });

      const user = userEvent.setup();

      renderForm();

      await user.type(screen.getByTestId("more_ballots_count"), "3");
      await user.type(screen.getByTestId("fewer_ballots_count"), "0");
      await user.type(screen.getByTestId("unreturned_ballots_count"), "0");
      await user.type(screen.getByTestId("too_few_ballots_handed_out_count"), "0");
      await user.type(screen.getByTestId("too_many_ballots_handed_out_count"), "1");
      await user.type(screen.getByTestId("other_explanation_count"), "0");
      await user.type(screen.getByTestId("no_explanation_count"), "1");

      const submitButton = screen.getByRole("button", { name: "Volgende" });
      await user.click(submitButton);

      const feedbackWarning = await screen.findByTestId("feedback-warning");
      expect(feedbackWarning).toHaveTextContent(/^W302$/);
      expect(screen.queryByTestId("feedback-error")).toBeNull();
      expect(screen.queryByTestId("server-feedback-error")).toBeNull();
    });

    test("W.303 Incorrect total", async () => {
      overrideOnce("post", "/api/polling_stations/1/data_entries/1", 200, {
        validation_results: {
          errors: [],
          warnings: [
            {
              fields: [
                "data.differences_counts.fewer_ballots_count",
                "data.differences_counts.unreturned_ballots_count",
                "data.differences_counts.too_few_ballots_handed_out_count",
                "data.differences_counts.too_few_ballots_handed_out_count",
                "data.differences_counts.other_explanation_count",
                "data.differences_counts.no_explanation_count",
              ],
              code: "W303",
            },
          ],
        },
      });

      const user = userEvent.setup();

      renderForm();

      await user.type(screen.getByTestId("more_ballots_count"), "0");
      await user.type(screen.getByTestId("fewer_ballots_count"), "4");
      await user.type(screen.getByTestId("unreturned_ballots_count"), "0");
      await user.type(screen.getByTestId("too_few_ballots_handed_out_count"), "1");
      await user.type(screen.getByTestId("too_many_ballots_handed_out_count"), "0");
      await user.type(screen.getByTestId("other_explanation_count"), "1");
      await user.type(screen.getByTestId("no_explanation_count"), "1");

      const submitButton = screen.getByRole("button", { name: "Volgende" });
      await user.click(submitButton);

      const feedbackWarning = await screen.findByTestId("feedback-warning");
      expect(feedbackWarning).toHaveTextContent(/^W303$/);
      expect(screen.queryByTestId("feedback-error")).toBeNull();
      expect(screen.queryByTestId("server-feedback-error")).toBeNull();
    });

    test("W.304 and W.306 No difference expected", async () => {
      overrideOnce("post", "/api/polling_stations/1/data_entries/1", 200, {
        validation_results: {
          errors: [],
          warnings: [
            {
              fields: ["data.differences_counts.fewer_ballots_count"],
              code: "W304",
            },
            {
              fields: [
                "data.differences_counts.unreturned_ballots_count",
                "data.differences_counts.too_few_ballots_handed_out_count",
                "data.differences_counts.too_few_ballots_handed_out_count",
                "data.differences_counts.other_explanation_count",
                "data.differences_counts.no_explanation_count",
              ],
              code: "W306",
            },
          ],
        },
      });

      const user = userEvent.setup();

      renderForm({ recounted: false });

      await user.type(screen.getByTestId("more_ballots_count"), "0");
      await user.type(screen.getByTestId("fewer_ballots_count"), "4");
      await user.type(screen.getByTestId("unreturned_ballots_count"), "1");
      await user.type(screen.getByTestId("too_few_ballots_handed_out_count"), "1");
      await user.type(screen.getByTestId("too_many_ballots_handed_out_count"), "0");
      await user.type(screen.getByTestId("other_explanation_count"), "1");
      await user.type(screen.getByTestId("no_explanation_count"), "1");

      const submitButton = screen.getByRole("button", { name: "Volgende" });
      await user.click(submitButton);

      const feedbackWarning = await screen.findByTestId("feedback-warning");
      expect(feedbackWarning).toHaveTextContent(/^W304W306$/);
      expect(screen.queryByTestId("feedback-error")).toBeNull();
      expect(screen.queryByTestId("server-feedback-error")).toBeNull();
    });

    test("W.305 and W.306 No difference expected", async () => {
      overrideOnce("post", "/api/polling_stations/1/data_entries/1", 200, {
        validation_results: {
          errors: [],
          warnings: [
            {
              fields: ["data.differences_counts.more_ballots_count"],
              code: "W305",
            },
            {
              fields: [
                "data.differences_counts.unreturned_ballots_count",
                "data.differences_counts.too_few_ballots_handed_out_count",
                "data.differences_counts.too_few_ballots_handed_out_count",
                "data.differences_counts.other_explanation_count",
                "data.differences_counts.no_explanation_count",
              ],
              code: "W306",
            },
          ],
        },
      });

      const user = userEvent.setup();

      renderForm({ recounted: true });

      await user.type(screen.getByTestId("more_ballots_count"), "4");
      await user.type(screen.getByTestId("fewer_ballots_count"), "0");
      await user.type(screen.getByTestId("unreturned_ballots_count"), "0");
      await user.type(screen.getByTestId("too_few_ballots_handed_out_count"), "0");
      await user.type(screen.getByTestId("too_many_ballots_handed_out_count"), "2");
      await user.type(screen.getByTestId("other_explanation_count"), "1");
      await user.type(screen.getByTestId("no_explanation_count"), "1");

      const submitButton = screen.getByRole("button", { name: "Volgende" });
      await user.click(submitButton);

      const feedbackWarning = await screen.findByTestId("feedback-warning");
      expect(feedbackWarning).toHaveTextContent(/^W305W306$/);
      expect(screen.queryByTestId("feedback-error")).toBeNull();
      expect(screen.queryByTestId("server-feedback-error")).toBeNull();
    });
  });
});
