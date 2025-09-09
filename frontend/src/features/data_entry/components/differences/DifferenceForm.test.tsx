import * as ReactRouter from "react-router";

import { userEvent } from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

import * as useUser from "@/hooks/user/useUser";
import { electionMockData } from "@/testing/api-mocks/ElectionMockData";
import {
  PollingStationDataEntryClaimHandler,
  PollingStationDataEntrySaveHandler,
} from "@/testing/api-mocks/RequestHandlers";
import { validationResultMockData } from "@/testing/api-mocks/ValidationResultMockData";
import { overrideOnce, server } from "@/testing/server";
import { getUrlMethodAndBody, render, screen, userTypeInputs } from "@/testing/test-utils";
import { LoginResponse, POLLING_STATION_DATA_ENTRY_SAVE_REQUEST_BODY } from "@/types/generated/openapi";

import { getDefaultDataEntryState, getEmptyDataEntryRequest } from "../../testing/mock-data";
import {
  expectCheckboxListToBeInvalidAndToHaveTextContent,
  expectCheckboxToBeValidAndToNotHaveAccessibleErrorMessage,
  expectFieldsToHaveIconAndToHaveAccessibleName,
  expectInputToBeValidAndToNotHaveAccessibleErrorMessage,
  expectInputToNotHaveIcon,
  overrideServerClaimDataEntryResponse,
} from "../../testing/test.utils";
import { DataEntryProvider } from "../DataEntryProvider";
import { DataEntrySection } from "../DataEntrySection";

const testUser: LoginResponse = {
  username: "test-user-1",
  user_id: 1,
  role: "typist",
  needs_password_change: false,
};

function renderForm() {
  vi.spyOn(ReactRouter, "useParams").mockReturnValue({ sectionId: "differences_counts" });

  return render(
    <DataEntryProvider election={electionMockData} pollingStationId={1} entryNumber={1}>
      <DataEntrySection />
    </DataEntryProvider>,
  );
}

const differencesFieldIds = {
  moreBallotsCount: "differences_counts.more_ballots_count",
  fewerBallotsCount: "differences_counts.fewer_ballots_count",
  compareVotesCastAdmittedVoters: "differences_counts.compare_votes_cast_admitted_voters",
  isAdmittedVotersEqualsVotesCast:
    "differences_counts.compare_votes_cast_admitted_voters.admitted_voters_equal_votes_cast",
  isVotesCastGreaterThanAdmittedVoters:
    "differences_counts.compare_votes_cast_admitted_voters.votes_cast_greater_than_admitted_voters",
  isVotesCastSmallerThanAdmittedVoters:
    "differences_counts.compare_votes_cast_admitted_voters.votes_cast_smaller_than_admitted_voters",
  isDifferenceCompletelyAccountedForYes: "differences_counts.difference_completely_accounted_for.yes",
  isDifferenceCompletelyAccountedForNo: "differences_counts.difference_completely_accounted_for.no",
};

describe("Test DifferencesForm", () => {
  beforeEach(() => {
    vi.spyOn(useUser, "useUser").mockReturnValue(testUser);
    server.use(PollingStationDataEntryClaimHandler, PollingStationDataEntrySaveHandler);
  });

  describe("DifferencesForm user interactions", () => {
    test("hitting enter key does not result in api call", async () => {
      const user = userEvent.setup();

      overrideServerClaimDataEntryResponse({
        formState: getDefaultDataEntryState().formState,
        pollingStationResults: {},
      });
      renderForm();

      const moreBallotsCount = await screen.findByRole("textbox", { name: "I Aantal méér getelde stemmen" });
      await user.type(moreBallotsCount, "12345");
      expect(moreBallotsCount).toHaveValue("12345");

      const spy = vi.spyOn(global, "fetch");

      await user.keyboard("{enter}");

      expect(spy).not.toHaveBeenCalled();
    });

    test("hitting shift+enter does result in api call", async () => {
      const user = userEvent.setup();
      overrideServerClaimDataEntryResponse({
        formState: getDefaultDataEntryState().formState,
        pollingStationResults: {},
      });

      renderForm();
      const spy = vi.spyOn(global, "fetch");

      const moreBallotsCount = await screen.findByRole("textbox", { name: "I Aantal méér getelde stemmen" });
      await user.type(moreBallotsCount, "12345");
      expect(moreBallotsCount).toHaveValue("12345");

      await user.keyboard("{shift>}{enter}{/shift}");

      expect(spy).toHaveBeenCalled();
    });

    test("Form field entry and keybindings", async () => {
      overrideOnce("post", "/api/polling_stations/1/data_entries/1", 200, {
        validation_results: { errors: [], warnings: [] },
      });

      const user = userEvent.setup();
      overrideServerClaimDataEntryResponse({
        formState: getDefaultDataEntryState().formState,
        pollingStationResults: {},
      });
      renderForm();

      const moreBallotsCount = await screen.findByRole("textbox", { name: "I Aantal méér getelde stemmen" });
      expect(moreBallotsCount).toHaveAccessibleName("I Aantal méér getelde stemmen");
      await user.type(moreBallotsCount, "12345");
      expect(moreBallotsCount).toHaveValue("12345");

      await user.keyboard("{enter}");

      const fewerBallotsCount = screen.getByRole("textbox", { name: "J Aantal minder getelde stemmen" });
      expect(fewerBallotsCount).toHaveFocus();
      await user.paste("6789");
      expect(fewerBallotsCount).toHaveValue("6789");

      await user.keyboard("{enter}");

      const submitButton = screen.getByRole("button", { name: "Volgende" });
      await user.click(submitButton);
    });
  });

  describe("DifferencesForm API request and response", () => {
    test("DifferencesForm request body is equal to the form data", async () => {
      const votersAndVotesValues = {
        voters_counts: {
          poll_card_count: 50,
          proxy_certificate_count: 1,
          total_admitted_voters_count: 53,
        },
        votes_counts: {
          political_group_total_votes: [
            { number: 1, total: 52 },
            { number: 2, total: 0 },
          ],
          total_votes_candidates_count: 52,
          blank_votes_count: 1,
          invalid_votes_count: 2,
          total_votes_cast_count: 55,
        },
      };

      const expectedRequest = {
        data: {
          ...getEmptyDataEntryRequest().data,
          ...votersAndVotesValues,
          differences_counts: {
            more_ballots_count: 2,
            fewer_ballots_count: 0,
            compare_votes_cast_admitted_voters: {
              admitted_voters_equal_votes_cast: false,
              votes_cast_greater_than_admitted_voters: false,
              votes_cast_smaller_than_admitted_voters: false,
            },
            difference_completely_accounted_for: { yes: false, no: false },
          },
        },
        client_state: {},
      };

      const user = userEvent.setup();
      overrideServerClaimDataEntryResponse({
        formState: getDefaultDataEntryState().formState,
        pollingStationResults: {
          ...votersAndVotesValues,
        },
      });

      renderForm();

      await screen.findByTestId("differences_counts_form");
      const spy = vi.spyOn(global, "fetch");
      await userTypeInputs(
        user,
        {
          more_ballots_count: expectedRequest.data.differences_counts.more_ballots_count,
          fewer_ballots_count: expectedRequest.data.differences_counts.fewer_ballots_count,
        },
        "data.differences_counts.",
      );

      const submitButton = await screen.findByRole("button", { name: "Volgende" });
      await user.click(submitButton);

      expect(spy).toHaveBeenCalled();
      const { url, method, body } = getUrlMethodAndBody(spy.mock.calls);
      expect(url).toEqual("/api/polling_stations/1/data_entries/1");
      expect(method).toEqual("POST");
      const request_body = body as POLLING_STATION_DATA_ENTRY_SAVE_REQUEST_BODY;
      expect(request_body.data).toEqual(expectedRequest.data);
    });
  });

  describe("DifferencesForm errors", () => {
    const validationError = "Controleer of je antwoord gelijk is aan het papieren proces-verbaal";

    test("F.301 Votes equals voters checked, but votes not equal to voters", async () => {
      const user = userEvent.setup();

      overrideServerClaimDataEntryResponse({
        formState: getDefaultDataEntryState().formState,
        pollingStationResults: {},
      });
      renderForm();

      await screen.findByTestId("differences_counts_form");
      overrideOnce("post", "/api/polling_stations/1/data_entries/1", 200, {
        validation_results: { errors: [validationResultMockData.F301], warnings: [] },
      });

      const submitButton = await screen.findByRole("button", { name: "Volgende" });
      await user.click(submitButton);

      const feedbackMessage = [
        "Controleer je antwoorden",
        "F.301",
        "Heb je iets niet goed overgenomen? Herstel de fout en ga verder.",
        "Heb je alles gecontroleerd en komt je invoer overeen met het papier? Ga dan verder.",
      ].join("");

      expect(await screen.findByTestId("feedback-error")).toHaveTextContent(feedbackMessage);
      expect(screen.queryByTestId("feedback-warning")).toBeNull();
      const expectedValidCheckboxFieldIds = [
        differencesFieldIds.isVotesCastGreaterThanAdmittedVoters,
        differencesFieldIds.isVotesCastSmallerThanAdmittedVoters,
        differencesFieldIds.isDifferenceCompletelyAccountedForYes,
        differencesFieldIds.isDifferenceCompletelyAccountedForNo,
      ];
      const expectedValidInputFieldIds = [differencesFieldIds.moreBallotsCount, differencesFieldIds.fewerBallotsCount];
      expectCheckboxListToBeInvalidAndToHaveTextContent(
        ["differences_counts.compare_votes_cast_admitted_voters-error"],
        validationError,
      );
      expectCheckboxToBeValidAndToNotHaveAccessibleErrorMessage(expectedValidCheckboxFieldIds);
      expectInputToBeValidAndToNotHaveAccessibleErrorMessage(expectedValidInputFieldIds);
      expectInputToNotHaveIcon(expectedValidInputFieldIds);
    });

    test("F.302 Voters greater than votes checked, but voters >= votes", async () => {
      const user = userEvent.setup();
      overrideServerClaimDataEntryResponse({
        formState: getDefaultDataEntryState().formState,
        pollingStationResults: {},
      });
      renderForm();

      await screen.findByTestId("differences_counts_form");
      overrideOnce("post", "/api/polling_stations/1/data_entries/1", 200, {
        validation_results: { errors: [validationResultMockData.F302], warnings: [] },
      });

      const submitButton = await screen.findByRole("button", { name: "Volgende" });
      await user.click(submitButton);

      const feedbackMessage = [
        "Controleer je antwoorden",
        "F.302",
        "Heb je iets niet goed overgenomen? Herstel de fout en ga verder.",
        "Heb je alles gecontroleerd en komt je invoer overeen met het papier? Ga dan verder.",
      ].join("");

      expect(await screen.findByTestId("feedback-error")).toHaveTextContent(feedbackMessage);
      expect(screen.queryByTestId("feedback-warning")).toBeNull();
      const expectedValidCheckboxFieldIds = [
        differencesFieldIds.isAdmittedVotersEqualsVotesCast,
        differencesFieldIds.isVotesCastSmallerThanAdmittedVoters,
        differencesFieldIds.isDifferenceCompletelyAccountedForYes,
        differencesFieldIds.isDifferenceCompletelyAccountedForNo,
      ];
      const expectedValidInputFieldIds = [differencesFieldIds.moreBallotsCount, differencesFieldIds.fewerBallotsCount];

      expectCheckboxListToBeInvalidAndToHaveTextContent(
        ["differences_counts.compare_votes_cast_admitted_voters-error"],
        validationError,
      );
      expectCheckboxToBeValidAndToNotHaveAccessibleErrorMessage(expectedValidCheckboxFieldIds);
      expectInputToBeValidAndToNotHaveAccessibleErrorMessage(expectedValidInputFieldIds);
      expectInputToNotHaveIcon(expectedValidInputFieldIds);
    });

    test("F.303 Votes smaller than voters checked, but voters >= voters", async () => {
      const user = userEvent.setup();

      overrideServerClaimDataEntryResponse({
        formState: getDefaultDataEntryState().formState,
        pollingStationResults: {},
      });

      renderForm();

      await screen.findByTestId("differences_counts_form");
      overrideOnce("post", "/api/polling_stations/1/data_entries/1", 200, {
        validation_results: { errors: [validationResultMockData.F303], warnings: [] },
      });

      const submitButton = await screen.findByRole("button", { name: "Volgende" });
      await user.click(submitButton);

      const feedbackMessage = [
        "Controleer je antwoorden",
        "F.303",
        "Heb je iets niet goed overgenomen? Herstel de fout en ga verder.",
        "Heb je alles gecontroleerd en komt je invoer overeen met het papier? Ga dan verder.",
      ].join("");

      expect(await screen.findByTestId("feedback-error")).toHaveTextContent(feedbackMessage);
      expect(screen.queryByTestId("feedback-warning")).toBeNull();
      const expectedValidCheckboxFieldIds = [
        differencesFieldIds.isAdmittedVotersEqualsVotesCast,
        differencesFieldIds.isVotesCastGreaterThanAdmittedVoters,
        differencesFieldIds.isDifferenceCompletelyAccountedForYes,
        differencesFieldIds.isDifferenceCompletelyAccountedForNo,
      ];
      const expectedValidInputFieldIds = [differencesFieldIds.moreBallotsCount, differencesFieldIds.fewerBallotsCount];
      expectCheckboxListToBeInvalidAndToHaveTextContent(
        ["differences_counts.compare_votes_cast_admitted_voters-error"],
        validationError,
      );
      expectCheckboxToBeValidAndToNotHaveAccessibleErrorMessage(expectedValidCheckboxFieldIds);
      expectInputToBeValidAndToNotHaveAccessibleErrorMessage(expectedValidInputFieldIds);
      expectInputToNotHaveIcon(expectedValidInputFieldIds);
    });

    test("F.304 Multiple fields or none checked of compare_votes_cast_admitted_voters", async () => {
      const user = userEvent.setup();

      overrideServerClaimDataEntryResponse({
        formState: getDefaultDataEntryState().formState,
        pollingStationResults: {},
      });

      renderForm();

      await screen.findByTestId("differences_counts_form");
      overrideOnce("post", "/api/polling_stations/1/data_entries/1", 200, {
        validation_results: { errors: [validationResultMockData.F304], warnings: [] },
      });

      const submitButton = await screen.findByRole("button", { name: "Volgende" });
      await user.click(submitButton);

      const feedbackMessage = [
        "Controleer je antwoorden",
        "F.304",
        "Heb je iets niet goed overgenomen? Herstel de fout en ga verder.",
        "Heb je alles gecontroleerd en komt je invoer overeen met het papier? Ga dan verder.",
      ].join("");

      expect(await screen.findByTestId("feedback-error")).toHaveTextContent(feedbackMessage);
      expect(screen.queryByTestId("feedback-warning")).toBeNull();
      const expectedValidCheckboxFieldIds = [
        differencesFieldIds.isVotesCastGreaterThanAdmittedVoters,
        differencesFieldIds.isVotesCastSmallerThanAdmittedVoters,
        differencesFieldIds.isDifferenceCompletelyAccountedForYes,
        differencesFieldIds.isDifferenceCompletelyAccountedForNo,
      ];
      const expectedValidInputFieldIds = [differencesFieldIds.moreBallotsCount, differencesFieldIds.fewerBallotsCount];
      expectCheckboxListToBeInvalidAndToHaveTextContent(
        ["differences_counts.compare_votes_cast_admitted_voters-error"],
        validationError,
      );
      expectCheckboxToBeValidAndToNotHaveAccessibleErrorMessage(expectedValidCheckboxFieldIds);
      expectInputToBeValidAndToNotHaveAccessibleErrorMessage(expectedValidInputFieldIds);
      expectInputToNotHaveIcon(expectedValidInputFieldIds);
    });

    test("F.305 Votes equals voters checked, but more_ballots_count and/or fewer_ballots_count are filled in", async () => {
      const user = userEvent.setup();

      overrideServerClaimDataEntryResponse({
        formState: getDefaultDataEntryState().formState,
        pollingStationResults: {},
      });

      renderForm();

      await screen.findByTestId("differences_counts_form");
      overrideOnce("post", "/api/polling_stations/1/data_entries/1", 200, {
        validation_results: { errors: [validationResultMockData.F305], warnings: [] },
      });

      const submitButton = await screen.findByRole("button", { name: "Volgende" });
      await user.click(submitButton);

      const feedbackMessage = [
        "Controleer je antwoorden",
        "F.305",
        "Heb je iets niet goed overgenomen? Herstel de fout en ga verder.",
        "Heb je alles gecontroleerd en komt je invoer overeen met het papier? Ga dan verder.",
      ].join("");

      expect(await screen.findByTestId("feedback-error")).toHaveTextContent(feedbackMessage);
      expect(screen.queryByTestId("feedback-warning")).toBeNull();
      const expectedValidCheckboxFieldIds = [
        differencesFieldIds.isAdmittedVotersEqualsVotesCast,
        differencesFieldIds.isVotesCastGreaterThanAdmittedVoters,
        differencesFieldIds.isVotesCastSmallerThanAdmittedVoters,
        differencesFieldIds.isDifferenceCompletelyAccountedForYes,
        differencesFieldIds.isDifferenceCompletelyAccountedForNo,
      ];
      const expectedInvalidInputFieldIds = [
        "data." + differencesFieldIds.moreBallotsCount,
        "data." + differencesFieldIds.fewerBallotsCount,
      ];
      expectCheckboxToBeValidAndToNotHaveAccessibleErrorMessage(expectedValidCheckboxFieldIds);
      expectFieldsToHaveIconAndToHaveAccessibleName(expectedInvalidInputFieldIds, "bevat een fout");
    });

    test("F.306 Votes > voters checked, but more_ballots_count <> votes - voters", async () => {
      const user = userEvent.setup();

      overrideServerClaimDataEntryResponse({
        formState: getDefaultDataEntryState().formState,
        pollingStationResults: {},
      });

      renderForm();

      await screen.findByTestId("differences_counts_form");
      overrideOnce("post", "/api/polling_stations/1/data_entries/1", 200, {
        validation_results: { errors: [validationResultMockData.F306], warnings: [] },
      });

      const submitButton = await screen.findByRole("button", { name: "Volgende" });
      await user.click(submitButton);

      const feedbackMessage = [
        "Controleer I (aantal méér getelde stemmen)",
        "F.306",
        "Heb je iets niet goed overgenomen? Herstel de fout en ga verder.",
        "Heb je alles gecontroleerd en komt je invoer overeen met het papier? Ga dan verder.",
      ].join("");

      expect(await screen.findByTestId("feedback-error")).toHaveTextContent(feedbackMessage);
      expect(screen.queryByTestId("feedback-warning")).toBeNull();
      const expectedValidCheckboxFieldIds = [
        differencesFieldIds.isAdmittedVotersEqualsVotesCast,
        differencesFieldIds.isVotesCastGreaterThanAdmittedVoters,
        differencesFieldIds.isVotesCastSmallerThanAdmittedVoters,
        differencesFieldIds.isDifferenceCompletelyAccountedForYes,
        differencesFieldIds.isDifferenceCompletelyAccountedForNo,
      ];
      const expectedValidInputFieldIds = [differencesFieldIds.fewerBallotsCount];
      const expectedInvalidInputFieldIds = ["data." + differencesFieldIds.moreBallotsCount];
      expectCheckboxToBeValidAndToNotHaveAccessibleErrorMessage(expectedValidCheckboxFieldIds);
      expectInputToBeValidAndToNotHaveAccessibleErrorMessage(expectedValidInputFieldIds);
      expectInputToNotHaveIcon(expectedValidInputFieldIds);
      expectFieldsToHaveIconAndToHaveAccessibleName(expectedInvalidInputFieldIds, "bevat een fout");
    });

    test("F.307 Votes > voters checked, but fewer_ballots_count is filled in", async () => {
      const user = userEvent.setup();

      overrideServerClaimDataEntryResponse({
        formState: getDefaultDataEntryState().formState,
        pollingStationResults: {},
      });

      renderForm();

      await screen.findByTestId("differences_counts_form");
      overrideOnce("post", "/api/polling_stations/1/data_entries/1", 200, {
        validation_results: { errors: [validationResultMockData.F307], warnings: [] },
      });

      const submitButton = await screen.findByRole("button", { name: "Volgende" });
      await user.click(submitButton);

      const feedbackMessage = [
        "Controleer je antwoorden",
        "F.307",
        "Heb je iets niet goed overgenomen? Herstel de fout en ga verder.",
        "Heb je alles gecontroleerd en komt je invoer overeen met het papier? Ga dan verder.",
      ].join("");

      expect(await screen.findByTestId("feedback-error")).toHaveTextContent(feedbackMessage);
      expect(screen.queryByTestId("feedback-warning")).toBeNull();
      const expectedValidCheckboxFieldIds = [
        differencesFieldIds.isAdmittedVotersEqualsVotesCast,
        differencesFieldIds.isVotesCastGreaterThanAdmittedVoters,
        differencesFieldIds.isVotesCastSmallerThanAdmittedVoters,
        differencesFieldIds.isDifferenceCompletelyAccountedForYes,
        differencesFieldIds.isDifferenceCompletelyAccountedForNo,
      ];
      const expectedInvalidInputFieldIds = [
        "data." + differencesFieldIds.moreBallotsCount,
        "data." + differencesFieldIds.fewerBallotsCount,
      ];
      expectCheckboxToBeValidAndToNotHaveAccessibleErrorMessage(expectedValidCheckboxFieldIds);
      expectFieldsToHaveIconAndToHaveAccessibleName(expectedInvalidInputFieldIds, "bevat een fout");
    });

    test("F.308 Votes < voters checked, but fewer_ballots_count <> voters - votes", async () => {
      const user = userEvent.setup();

      overrideServerClaimDataEntryResponse({
        formState: getDefaultDataEntryState().formState,
        pollingStationResults: {},
      });

      renderForm();

      await screen.findByTestId("differences_counts_form");
      overrideOnce("post", "/api/polling_stations/1/data_entries/1", 200, {
        validation_results: { errors: [validationResultMockData.F308], warnings: [] },
      });

      const submitButton = await screen.findByRole("button", { name: "Volgende" });
      await user.click(submitButton);

      const feedbackMessage = [
        "Controleer je antwoorden",
        "F.308",
        "Heb je iets niet goed overgenomen? Herstel de fout en ga verder.",
        "Heb je alles gecontroleerd en komt je invoer overeen met het papier? Ga dan verder.",
      ].join("");

      expect(await screen.findByTestId("feedback-error")).toHaveTextContent(feedbackMessage);
      expect(screen.queryByTestId("feedback-warning")).toBeNull();
      const expectedValidCheckboxFieldIds = [
        differencesFieldIds.isAdmittedVotersEqualsVotesCast,
        differencesFieldIds.isVotesCastGreaterThanAdmittedVoters,
        differencesFieldIds.isVotesCastSmallerThanAdmittedVoters,
        differencesFieldIds.isDifferenceCompletelyAccountedForYes,
        differencesFieldIds.isDifferenceCompletelyAccountedForNo,
      ];
      const expectedValidInputFieldIds = [differencesFieldIds.moreBallotsCount];
      const expectedInvalidInputFieldIds = ["data." + differencesFieldIds.fewerBallotsCount];
      expectCheckboxToBeValidAndToNotHaveAccessibleErrorMessage(expectedValidCheckboxFieldIds);
      expectInputToBeValidAndToNotHaveAccessibleErrorMessage(expectedValidInputFieldIds);
      expectInputToNotHaveIcon(expectedValidInputFieldIds);
      expectFieldsToHaveIconAndToHaveAccessibleName(expectedInvalidInputFieldIds, "bevat een fout");
    });

    test("F.309 Votes < voters checked, but more_ballots_count is filled in", async () => {
      const user = userEvent.setup();

      overrideServerClaimDataEntryResponse({
        formState: getDefaultDataEntryState().formState,
        pollingStationResults: {},
      });

      renderForm();

      await screen.findByTestId("differences_counts_form");
      overrideOnce("post", "/api/polling_stations/1/data_entries/1", 200, {
        validation_results: { errors: [validationResultMockData.F309], warnings: [] },
      });

      const submitButton = await screen.findByRole("button", { name: "Volgende" });
      await user.click(submitButton);

      const feedbackMessage = [
        "Controleer je antwoorden",
        "F.309",
        "Heb je iets niet goed overgenomen? Herstel de fout en ga verder.",
        "Heb je alles gecontroleerd en komt je invoer overeen met het papier? Ga dan verder.",
      ].join("");

      expect(await screen.findByTestId("feedback-error")).toHaveTextContent(feedbackMessage);
      expect(screen.queryByTestId("feedback-warning")).toBeNull();
      const expectedValidCheckboxFieldIds = [
        differencesFieldIds.isAdmittedVotersEqualsVotesCast,
        differencesFieldIds.isVotesCastGreaterThanAdmittedVoters,
        differencesFieldIds.isVotesCastSmallerThanAdmittedVoters,
        differencesFieldIds.isDifferenceCompletelyAccountedForYes,
        differencesFieldIds.isDifferenceCompletelyAccountedForNo,
      ];
      const expectedInvalidInputFieldIds = [
        "data." + differencesFieldIds.moreBallotsCount,
        "data." + differencesFieldIds.fewerBallotsCount,
      ];
      expectCheckboxToBeValidAndToNotHaveAccessibleErrorMessage(expectedValidCheckboxFieldIds);
      expectFieldsToHaveIconAndToHaveAccessibleName(expectedInvalidInputFieldIds, "bevat een fout");
    });

    test("F.310 Voters <> votes and difference_completely_account_for all or none checked", async () => {
      const user = userEvent.setup();

      overrideServerClaimDataEntryResponse({
        formState: getDefaultDataEntryState().formState,
        pollingStationResults: {},
      });

      renderForm();

      await screen.findByTestId("differences_counts_form");
      overrideOnce("post", "/api/polling_stations/1/data_entries/1", 200, {
        validation_results: { errors: [validationResultMockData.F310], warnings: [] },
      });

      const submitButton = await screen.findByRole("button", { name: "Volgende" });
      await user.click(submitButton);

      const feedbackMessage = [
        "Controleer je antwoorden",
        "F.310",
        "Heb je iets niet goed overgenomen? Herstel de fout en ga verder.",
        "Heb je alles gecontroleerd en komt je invoer overeen met het papier? Ga dan verder.",
      ].join("");

      expect(await screen.findByTestId("feedback-error")).toHaveTextContent(feedbackMessage);
      expect(screen.queryByTestId("feedback-warning")).toBeNull();
      const expectedValidCheckboxFieldIds = [
        differencesFieldIds.isAdmittedVotersEqualsVotesCast,
        differencesFieldIds.isVotesCastGreaterThanAdmittedVoters,
        differencesFieldIds.isVotesCastSmallerThanAdmittedVoters,
        differencesFieldIds.isDifferenceCompletelyAccountedForYes,
        differencesFieldIds.isDifferenceCompletelyAccountedForNo,
      ];
      expectCheckboxToBeValidAndToNotHaveAccessibleErrorMessage(expectedValidCheckboxFieldIds);
      expectCheckboxListToBeInvalidAndToHaveTextContent(
        ["differences_counts.difference_completely_accounted_for-error"],
        validationError,
      );
    });
  });
});
