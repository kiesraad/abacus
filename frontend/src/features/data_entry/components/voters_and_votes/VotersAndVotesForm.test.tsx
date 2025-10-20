import * as ReactRouter from "react-router";

import { userEvent, UserEvent } from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

import * as useUser from "@/hooks/user/useUser";
import { MessagesProvider } from "@/hooks/messages/MessagesProvider";
import { electionMockData } from "@/testing/api-mocks/ElectionMockData";
import { pollingStationMockData } from "@/testing/api-mocks/PollingStationMockData";
import {
  PollingStationDataEntryClaimHandler,
  PollingStationDataEntrySaveHandler,
} from "@/testing/api-mocks/RequestHandlers";
import { validationResultMockData } from "@/testing/api-mocks/ValidationResultMockData";
import { overrideOnce, server } from "@/testing/server";
import {
  getUrlMethodAndBody,
  render,
  screen,
  userTypeInputs,
  userTypeInputsArray,
  waitFor,
} from "@/testing/test-utils";
import {
  LoginResponse,
  POLLING_STATION_DATA_ENTRY_SAVE_REQUEST_BODY,
  PollingStationResults,
} from "@/types/generated/openapi";

import { getDefaultDataEntryState, getEmptyDataEntryRequest } from "../../testing/mock-data";
import {
  expectFieldsToBeInvalidAndToHaveAccessibleErrorMessage,
  expectFieldsToBeValidAndToNotHaveAccessibleErrorMessage,
  expectFieldsToHaveIconAndToHaveAccessibleName,
  expectFieldsToNotHaveIcon,
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
  vi.spyOn(ReactRouter, "useParams").mockReturnValue({ sectionId: "voters_votes_counts" });

  return render(
    <MessagesProvider>
      <DataEntryProvider election={electionMockData} pollingStation={pollingStationMockData[0]!} entryNumber={1}>
        <DataEntrySection />
      </DataEntryProvider>
    </MessagesProvider>,
  );
}

const votersFieldIds = {
  pollCardCount: "data.voters_counts.poll_card_count",
  proxyCertificateCount: "data.voters_counts.proxy_certificate_count",
  totalAdmittedVotersCount: "data.voters_counts.total_admitted_voters_count",
};

const votesFieldIds = {
  politicalGroup1TotalVotes: "data.votes_counts.political_group_total_votes[0].total",
  politicalGroup2TotalVotes: "data.votes_counts.political_group_total_votes[1].total",
  totalVotesCandidatesCount: "data.votes_counts.total_votes_candidates_count",
  blankVotesCount: "data.votes_counts.blank_votes_count",
  invalidVotesCount: "data.votes_counts.invalid_votes_count",
  totalVotesCastCount: "data.votes_counts.total_votes_cast_count",
};

describe("Test VotersAndVotesForm", () => {
  beforeEach(() => {
    vi.spyOn(useUser, "useUser").mockReturnValue(testUser);
    server.use(PollingStationDataEntryClaimHandler, PollingStationDataEntrySaveHandler);
  });

  describe("VotersAndVotesForm user interactions", () => {
    test("hitting enter key does not result in api call", async () => {
      const user = userEvent.setup();

      renderForm();

      const pollCards = await screen.findByRole("textbox", { name: "A Stempassen" });
      await user.type(pollCards, "12345");
      expect(pollCards).toHaveValue("12345");

      const spy = vi.spyOn(global, "fetch");

      await user.keyboard("{enter}");

      expect(spy).not.toHaveBeenCalled();
    });

    test("hitting shift+enter does result in api call", async () => {
      const user = userEvent.setup();

      renderForm();
      const spy = vi.spyOn(global, "fetch");

      const pollCards = await screen.findByRole("textbox", { name: "A Stempassen" });
      await user.type(pollCards, "12345");
      expect(pollCards).toHaveValue("12345");

      await user.keyboard("{shift>}{enter}{/shift}");

      expect(spy).toHaveBeenCalled();
    });

    //TODO: duplicate test for other forms?
    test("Inputs show formatted numbers when blurred", async () => {
      const user = userEvent.setup();

      renderForm();

      const pollCards = await screen.findByRole("textbox", { name: "A Stempassen" });
      await user.type(pollCards, "12345");

      await user.keyboard("{enter}");
      const proxyCertificates = screen.getByRole("textbox", { name: "B Volmachtbewijzen" });
      expect(proxyCertificates).toHaveFocus();

      const pollCardsOverlay = await screen.findByTestId("data.voters_counts.poll_card_count-formatted-overlay");
      expect(pollCardsOverlay).toHaveTextContent("12.345");
    });

    test("Form field entry and keybindings", async () => {
      const user = userEvent.setup();
      overrideServerClaimDataEntryResponse({
        formState: getDefaultDataEntryState().formState,
        pollingStationResults: {},
      });
      renderForm();

      const pollCards = await screen.findByRole("textbox", { name: "A Stempassen" });
      expect(pollCards.closest("fieldset")).toHaveAccessibleName(
        "Toegelaten kiezers en uitgebrachte stemmen B1-3.1 en 3.2",
      );
      expect(pollCards).toHaveAccessibleName("A Stempassen");
      expect(pollCards).toHaveFocus();

      await user.type(pollCards, "12345");
      expect(pollCards).toHaveValue("12345");

      await user.keyboard("{enter}");

      const proxyCertificates = screen.getByRole("textbox", { name: "B Volmachtbewijzen" });
      expect(proxyCertificates).toHaveFocus();
      await user.paste("6789");
      expect(proxyCertificates).toHaveValue("6789");

      await user.keyboard("{enter}");

      const totalAdmittedVoters = screen.getByRole("textbox", { name: "D Totaal toegelaten kiezers" });
      expect(totalAdmittedVoters).toHaveFocus();
      await user.paste("4242");
      expect(totalAdmittedVoters).toHaveValue("4242");

      await user.keyboard("{enter}");

      const totalVotesOnPoliticalParty1 = screen.getByRole("textbox", {
        name: "E.1 Totaal Lijst 1 - Vurige Vleugels Partij",
      });
      expect(totalVotesOnPoliticalParty1).toHaveFocus();
      await user.type(totalVotesOnPoliticalParty1, "12");
      expect(totalVotesOnPoliticalParty1).toHaveValue("12");

      await user.keyboard("{enter}");

      const totalVotesOnPoliticalParty2 = screen.getByRole("textbox", {
        name: "E.2 Totaal Lijst 2 - Wijzen van Water en Wind",
      });
      expect(totalVotesOnPoliticalParty2).toHaveFocus();
      await user.type(totalVotesOnPoliticalParty2, "34");
      expect(totalVotesOnPoliticalParty2).toHaveValue("34");

      await user.keyboard("{enter}");

      const totalVotesOnCandidates = screen.getByRole("textbox", { name: "E Totaal stemmen op kandidaten" });
      expect(totalVotesOnCandidates).toHaveFocus();
      await user.type(totalVotesOnCandidates, "56");
      expect(totalVotesOnCandidates).toHaveValue("56");

      await user.keyboard("{enter}");

      const blankVotes = screen.getByRole("textbox", { name: "F Blanco stemmen" });
      expect(blankVotes).toHaveFocus();
      // Test if maxLength on field works
      await user.type(blankVotes, "1234567890");
      expect(blankVotes).toHaveValue("123456789");

      await user.keyboard("{enter}");

      const invalidVotes = screen.getByRole("textbox", { name: "G Ongeldige stemmen" });
      expect(invalidVotes).toHaveFocus();
      await user.type(invalidVotes, "3");
      expect(invalidVotes).toHaveValue("3");

      await user.keyboard("{enter}");

      const totalVotesCast = screen.getByRole("textbox", { name: "H Totaal uitgebrachte stemmen" });
      expect(totalVotesCast).toHaveFocus();
      await user.type(totalVotesCast, "555");
      expect(totalVotesCast).toHaveValue("555");

      await user.keyboard("{enter}");

      const submitButton = screen.getByRole("button", { name: "Volgende" });
      await user.click(submitButton);
    });
  });

  describe("VotersAndVotesForm API request and response", () => {
    test("VotersAndVotesForm request body is equal to the form data", async () => {
      const expectedRequest = {
        data: {
          ...getEmptyDataEntryRequest().data,
          voters_counts: {
            poll_card_count: 4,
            proxy_certificate_count: 2,
            total_admitted_voters_count: 6,
          },
          votes_counts: {
            political_group_total_votes: [
              { number: 1, total: 3 },
              { number: 2, total: 1 },
            ],
            total_votes_candidates_count: 4,
            blank_votes_count: 5,
            invalid_votes_count: 6,
            total_votes_cast_count: 15,
          },
        } satisfies PollingStationResults,
        client_state: {},
      };

      const user = userEvent.setup();
      overrideServerClaimDataEntryResponse({
        formState: getDefaultDataEntryState().formState,
        pollingStationResults: {},
      });
      renderForm();

      await userTypeInputs(user, expectedRequest.data.voters_counts, "data.voters_counts.");

      const { political_group_total_votes, ...votes_counts } = expectedRequest.data.votes_counts;
      await userTypeInputs(user, votes_counts, "data.votes_counts.");
      await userTypeInputsArray(
        user,
        political_group_total_votes,
        "data.votes_counts.political_group_total_votes",
        "total",
      );

      const spy = vi.spyOn(global, "fetch");

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

  describe("VotersAndVotesForm errors", () => {
    test("clicking next without accepting error results in alert shown and then accept error", async () => {
      const user = userEvent.setup();

      renderForm();

      await screen.findByTestId("voters_votes_counts_form");
      overrideOnce("post", "/api/polling_stations/1/data_entries/1", 200, {
        validation_results: {
          errors: [
            {
              fields: [
                "data.voters_counts.total_admitted_voters_count",
                "data.voters_counts.poll_card_count",
                "data.voters_counts.proxy_certificate_count",
              ],
              code: "F201",
            },
          ],
          warnings: [],
        },
      });

      const submitButton = await screen.findByRole("button", { name: "Volgende" });
      await user.click(submitButton);

      const acceptFeedbackCheckbox = screen.getByRole("checkbox", {
        name: "Ik heb mijn invoer gecontroleerd met het papier en correct overgenomen.",
      });

      expect(acceptFeedbackCheckbox).toBeVisible();
      expect(acceptFeedbackCheckbox).not.toBeChecked();
      acceptFeedbackCheckbox.click();
      expect(acceptFeedbackCheckbox).toBeChecked();

      await user.click(submitButton);
    });

    test("F.201 IncorrectTotal Voters counts", async () => {
      const user = userEvent.setup();

      renderForm();

      await screen.findByTestId("voters_votes_counts_form");
      overrideOnce("post", "/api/polling_stations/1/data_entries/1", 200, {
        validation_results: {
          errors: [
            {
              fields: [
                "data.voters_counts.total_admitted_voters_count",
                "data.voters_counts.poll_card_count",
                "data.voters_counts.proxy_certificate_count",
              ],
              code: "F201",
            },
          ],
          warnings: [],
        },
      });

      const submitButton = await screen.findByRole("button", { name: "Volgende" });
      await user.click(submitButton);

      const feedbackMessage = [
        "Controleer je antwoorden",
        "F.201",
        "Heb je iets niet goed overgenomen? Herstel de fout en ga verder.",
        "Heb je alles gecontroleerd en komt je invoer overeen met het papier? Ga dan verder.",
      ].join("");

      expect(await screen.findByTestId("feedback-error")).toHaveTextContent(feedbackMessage);
      expect(screen.queryByTestId("feedback-warning")).toBeNull();
      const expectedInvalidFieldIds = [
        votersFieldIds.pollCardCount,
        votersFieldIds.proxyCertificateCount,
        votersFieldIds.totalAdmittedVotersCount,
      ];
      const expectedValidFieldIds = [
        votesFieldIds.politicalGroup1TotalVotes,
        votesFieldIds.politicalGroup2TotalVotes,
        votesFieldIds.totalVotesCandidatesCount,
        votesFieldIds.blankVotesCount,
        votesFieldIds.invalidVotesCount,
        votesFieldIds.totalVotesCastCount,
      ];
      expectFieldsToBeInvalidAndToHaveAccessibleErrorMessage(expectedInvalidFieldIds, feedbackMessage);
      expectFieldsToHaveIconAndToHaveAccessibleName(expectedInvalidFieldIds, "bevat een fout");
      expectFieldsToBeValidAndToNotHaveAccessibleErrorMessage(expectedValidFieldIds);
      expectFieldsToNotHaveIcon(expectedValidFieldIds);
    });

    test("F.203 IncorrectTotal Votes counts", async () => {
      const user = userEvent.setup();

      renderForm();

      await screen.findByTestId("voters_votes_counts_form");
      overrideOnce("post", "/api/polling_stations/1/data_entries/1", 200, {
        validation_results: { errors: [validationResultMockData.F203], warnings: [] },
      });

      const submitButton = await screen.findByRole("button", { name: "Volgende" });
      await user.click(submitButton);

      const feedbackMessage = [
        "Controleer je antwoorden",
        "F.203",
        "Heb je iets niet goed overgenomen? Herstel de fout en ga verder.",
        "Heb je alles gecontroleerd en komt je invoer overeen met het papier? Ga dan verder.",
      ].join("");

      expect(await screen.findByTestId("feedback-error")).toHaveTextContent(feedbackMessage);
      expect(screen.queryByTestId("feedback-warning")).toBeNull();
      const expectedInvalidFieldIds = [
        votesFieldIds.totalVotesCandidatesCount,
        votesFieldIds.blankVotesCount,
        votesFieldIds.invalidVotesCount,
        votesFieldIds.totalVotesCastCount,
      ];
      const expectedValidFieldIds = [
        votesFieldIds.politicalGroup1TotalVotes,
        votesFieldIds.politicalGroup2TotalVotes,
        votersFieldIds.pollCardCount,
        votersFieldIds.proxyCertificateCount,
        votersFieldIds.totalAdmittedVotersCount,
      ];
      expectFieldsToBeInvalidAndToHaveAccessibleErrorMessage(expectedInvalidFieldIds, feedbackMessage);
      expectFieldsToHaveIconAndToHaveAccessibleName(expectedInvalidFieldIds, "bevat een fout");
      expectFieldsToBeValidAndToNotHaveAccessibleErrorMessage(expectedValidFieldIds);
      expectFieldsToNotHaveIcon(expectedValidFieldIds);
    });
  });

  describe("VotersAndVotesForm warnings", () => {
    test("clicking next without accepting warning results in alert shown and then accept warning", async () => {
      const user = userEvent.setup();

      renderForm();

      await screen.findByTestId("voters_votes_counts_form");
      overrideOnce("post", "/api/polling_stations/1/data_entries/1", 200, {
        validation_results: { errors: [], warnings: [validationResultMockData.W201] },
      });

      const submitButton = await screen.findByRole("button", { name: "Volgende" });
      await user.click(submitButton);

      const feedbackMessage = [
        "Controleer F",
        "W.201",
        "Heb je iets niet goed overgenomen? Herstel de fout en ga verder.",
        "Heb je alles gecontroleerd en komt je invoer overeen met het papier? Ga dan verder.",
      ].join("");

      const feedbackWarning = await screen.findByTestId("feedback-warning");
      expect(feedbackWarning).toHaveTextContent(feedbackMessage);
      expect(screen.queryByTestId("feedback-error")).toBeNull();
      const expectedInvalidFieldIds = [votesFieldIds.blankVotesCount];
      const expectedValidFieldIds = [
        votersFieldIds.pollCardCount,
        votersFieldIds.proxyCertificateCount,
        votersFieldIds.totalAdmittedVotersCount,
        votesFieldIds.politicalGroup1TotalVotes,
        votesFieldIds.politicalGroup2TotalVotes,
        votesFieldIds.totalVotesCandidatesCount,
        votesFieldIds.invalidVotesCount,
        votesFieldIds.totalVotesCastCount,
      ];
      expectFieldsToBeInvalidAndToHaveAccessibleErrorMessage(expectedInvalidFieldIds, feedbackMessage);
      expectFieldsToHaveIconAndToHaveAccessibleName(expectedInvalidFieldIds, "bevat een waarschuwing");
      expectFieldsToBeValidAndToNotHaveAccessibleErrorMessage(expectedValidFieldIds);
      expectFieldsToNotHaveIcon(expectedValidFieldIds);

      let acceptFeedbackCheckbox = screen.getByRole("checkbox", {
        name: "Ik heb mijn invoer gecontroleerd met het papier en correct overgenomen.",
      });
      expect(acceptFeedbackCheckbox).toBeInTheDocument();
      expect(acceptFeedbackCheckbox).toBeVisible();
      expect(acceptFeedbackCheckbox).not.toBeChecked();

      await user.click(submitButton);
      const alertText = screen.getByRole("alert");
      expect(alertText).toHaveTextContent(
        /^Je kan alleen verder als je het papieren proces-verbaal hebt gecontroleerd.$/,
      );

      acceptFeedbackCheckbox.click();
      expect(acceptFeedbackCheckbox).toBeChecked();

      await user.clear(screen.getByTestId(votesFieldIds.blankVotesCount));
      await user.type(screen.getByTestId(votesFieldIds.blankVotesCount), "100");
      await user.tab();
      expect(screen.getByTestId(votesFieldIds.blankVotesCount), "100").toHaveValue("100");
      await user.clear(screen.getByTestId(votesFieldIds.blankVotesCount));

      await waitFor(() => expect(acceptFeedbackCheckbox).not.toBeInTheDocument());

      overrideOnce("post", "/api/polling_stations/1/data_entries/1", 200, {
        validation_results: {
          errors: [],
          warnings: [validationResultMockData.W201],
        },
      });

      await user.click(submitButton);

      acceptFeedbackCheckbox = screen.getByRole("checkbox", {
        name: "Ik heb mijn invoer gecontroleerd met het papier en correct overgenomen.",
      });
      expect(acceptFeedbackCheckbox).toBeVisible();
      expect(acceptFeedbackCheckbox).not.toBeChecked();
      acceptFeedbackCheckbox.click();
      expect(acceptFeedbackCheckbox).toBeChecked();

      await user.click(submitButton);

      expect(feedbackWarning).toHaveTextContent(feedbackMessage);
      // All fields should be considered valid now
      //TODO: is this true? there is a warning in blank votes, so it should not be valid?
      //expectedValidFieldIds = expectedValidFieldIds.concat(expectedInvalidFieldIds);
      expectFieldsToBeValidAndToNotHaveAccessibleErrorMessage(expectedValidFieldIds);
      expectFieldsToNotHaveIcon(expectedValidFieldIds);
    });

    test("W.201 high number of blank votes", async () => {
      const user = userEvent.setup();

      renderForm();

      await screen.findByTestId("voters_votes_counts_form");
      overrideOnce("post", "/api/polling_stations/1/data_entries/1", 200, {
        validation_results: {
          errors: [],
          warnings: [{ fields: ["data.votes_counts.blank_votes_count"], code: "W201" }],
        },
      });

      const submitButton = await screen.findByRole("button", { name: "Volgende" });
      await user.click(submitButton);

      const feedbackMessage = [
        "Controleer F",
        "W.201",
        "Heb je iets niet goed overgenomen? Herstel de fout en ga verder.",
        "Heb je alles gecontroleerd en komt je invoer overeen met het papier? Ga dan verder.",
      ].join("");

      expect(await screen.findByTestId("feedback-warning")).toHaveTextContent(feedbackMessage);
      expect(screen.queryByTestId("feedback-error")).toBeNull();
      const expectedInvalidFieldIds = [votesFieldIds.blankVotesCount];
      const expectedValidFieldIds = [
        votersFieldIds.pollCardCount,
        votersFieldIds.proxyCertificateCount,
        votersFieldIds.totalAdmittedVotersCount,
        votesFieldIds.politicalGroup1TotalVotes,
        votesFieldIds.politicalGroup2TotalVotes,
        votesFieldIds.totalVotesCandidatesCount,
        votesFieldIds.invalidVotesCount,
        votesFieldIds.totalVotesCastCount,
      ];
      expectFieldsToBeInvalidAndToHaveAccessibleErrorMessage(expectedInvalidFieldIds, feedbackMessage);
      expectFieldsToHaveIconAndToHaveAccessibleName(expectedInvalidFieldIds, "bevat een waarschuwing");
      expectFieldsToBeValidAndToNotHaveAccessibleErrorMessage(expectedValidFieldIds);
      expectFieldsToNotHaveIcon(expectedValidFieldIds);
    });

    test("W.202 high number of invalid votes", async () => {
      const user = userEvent.setup();

      renderForm();

      await screen.findByTestId("voters_votes_counts_form");
      overrideOnce("post", "/api/polling_stations/1/data_entries/1", 200, {
        validation_results: {
          errors: [],
          warnings: [{ fields: ["data.votes_counts.invalid_votes_count"], code: "W202" }],
        },
      });

      const submitButton = await screen.findByRole("button", { name: "Volgende" });
      await user.click(submitButton);

      const feedbackMessage = [
        "Controleer G",
        "W.202",
        "Heb je iets niet goed overgenomen? Herstel de fout en ga verder.",
        "Heb je alles gecontroleerd en komt je invoer overeen met het papier? Ga dan verder.",
      ].join("");

      expect(await screen.findByTestId("feedback-warning")).toHaveTextContent(feedbackMessage);
      expect(screen.queryByTestId("feedback-error")).toBeNull();
      const expectedInvalidFieldIds = [votesFieldIds.invalidVotesCount];
      const expectedValidFieldIds = [
        votersFieldIds.pollCardCount,
        votersFieldIds.proxyCertificateCount,
        votersFieldIds.totalAdmittedVotersCount,
        votesFieldIds.politicalGroup1TotalVotes,
        votesFieldIds.politicalGroup2TotalVotes,
        votesFieldIds.totalVotesCandidatesCount,
        votesFieldIds.blankVotesCount,
        votesFieldIds.totalVotesCastCount,
      ];
      expectFieldsToBeInvalidAndToHaveAccessibleErrorMessage(expectedInvalidFieldIds, feedbackMessage);
      expectFieldsToHaveIconAndToHaveAccessibleName(expectedInvalidFieldIds, "bevat een waarschuwing");
      expectFieldsToBeValidAndToNotHaveAccessibleErrorMessage(expectedValidFieldIds);
      expectFieldsToNotHaveIcon(expectedValidFieldIds);
    });

    test("W.203 voters counts and votes counts difference above threshold", async () => {
      const user = userEvent.setup();

      renderForm();

      await screen.findByTestId("voters_votes_counts_form");
      overrideOnce("post", "/api/polling_stations/1/data_entries/1", 200, {
        validation_results: { errors: [], warnings: [validationResultMockData.W203] },
      });

      const submitButton = await screen.findByRole("button", { name: "Volgende" });
      await user.click(submitButton);

      const feedbackMessage = [
        "Controleer D en H",
        "W.203",
        "Heb je iets niet goed overgenomen? Herstel de fout en ga verder.",
        "Heb je alles gecontroleerd en komt je invoer overeen met het papier? Ga dan verder.",
      ].join("");

      expect(await screen.findByTestId("feedback-warning")).toHaveTextContent(feedbackMessage);
      expect(screen.queryByTestId("feedback-error")).toBeNull();
      const expectedInvalidFieldIds = [votesFieldIds.totalVotesCastCount, votersFieldIds.totalAdmittedVotersCount];
      const expectedValidFieldIds = [
        votersFieldIds.pollCardCount,
        votersFieldIds.proxyCertificateCount,
        votesFieldIds.politicalGroup1TotalVotes,
        votesFieldIds.politicalGroup2TotalVotes,
        votesFieldIds.totalVotesCandidatesCount,
        votesFieldIds.blankVotesCount,
        votesFieldIds.invalidVotesCount,
      ];
      expectFieldsToBeInvalidAndToHaveAccessibleErrorMessage(expectedInvalidFieldIds, feedbackMessage);
      expectFieldsToHaveIconAndToHaveAccessibleName(expectedInvalidFieldIds, "bevat een waarschuwing");
      expectFieldsToBeValidAndToNotHaveAccessibleErrorMessage(expectedValidFieldIds);
      expectFieldsToNotHaveIcon(expectedValidFieldIds);
    });

    test("W.204 total votes cast should not be zero", async () => {
      const user = userEvent.setup();

      renderForm();

      await screen.findByTestId("voters_votes_counts_form");
      overrideOnce("post", "/api/polling_stations/1/data_entries/1", 200, {
        validation_results: { errors: [], warnings: [validationResultMockData.W204] },
      });

      const submitButton = await screen.findByRole("button", { name: "Volgende" });
      await user.click(submitButton);

      const feedbackMessage = [
        "Controleer H",
        "W.204",
        "Heb je iets niet goed overgenomen? Herstel de fout en ga verder.",
        "Heb je alles gecontroleerd en komt je invoer overeen met het papier? Ga dan verder.",
      ].join("");

      expect(await screen.findByTestId("feedback-warning")).toHaveTextContent(feedbackMessage);
      expect(screen.queryByTestId("feedback-error")).toBeNull();
      const expectedInvalidFieldIds = [votesFieldIds.totalVotesCastCount];
      const expectedValidFieldIds = [
        votersFieldIds.pollCardCount,
        votersFieldIds.proxyCertificateCount,
        votersFieldIds.totalAdmittedVotersCount,
        votesFieldIds.politicalGroup1TotalVotes,
        votesFieldIds.politicalGroup2TotalVotes,
        votesFieldIds.totalVotesCandidatesCount,
        votesFieldIds.blankVotesCount,
        votesFieldIds.invalidVotesCount,
      ];
      expectFieldsToBeInvalidAndToHaveAccessibleErrorMessage(expectedInvalidFieldIds, feedbackMessage);
      expectFieldsToHaveIconAndToHaveAccessibleName(expectedInvalidFieldIds, "bevat een waarschuwing");
      expectFieldsToBeValidAndToNotHaveAccessibleErrorMessage(expectedValidFieldIds);
      expectFieldsToNotHaveIcon(expectedValidFieldIds);
    });
  });

  describe("VotersAndVotesForm accept warnings", () => {
    let user: UserEvent;
    let submitButton: HTMLButtonElement;
    let acceptErrorsAndWarningsCheckbox: HTMLInputElement;

    beforeEach(async () => {
      overrideOnce("post", "/api/polling_stations/1/data_entries/1", 200, {
        validation_results: {
          errors: [],
          warnings: [{ fields: ["data.votes_counts.blank_votes_count"], code: "W201" }],
        },
      });

      renderForm();

      user = userEvent.setup();
      submitButton = await screen.findByRole("button", { name: "Volgende" });
      await user.click(submitButton);

      acceptErrorsAndWarningsCheckbox = await screen.findByRole("checkbox", {
        name: "Ik heb mijn invoer gecontroleerd met het papier en correct overgenomen.",
      });
    });

    test("checkbox should disappear when filling in any form input", async () => {
      expect(acceptErrorsAndWarningsCheckbox).toBeVisible();
      expect(acceptErrorsAndWarningsCheckbox).not.toBeInvalid();

      const input = await screen.findByLabelText("H Totaal uitgebrachte stemmen");
      await user.type(input, "1");

      expect(acceptErrorsAndWarningsCheckbox).not.toBeVisible();
    });

    test("checkbox with error should disappear when filling in any form input", async () => {
      expect(acceptErrorsAndWarningsCheckbox).toBeVisible();
      expect(acceptErrorsAndWarningsCheckbox).not.toBeInvalid();

      await user.click(submitButton);

      expect(acceptErrorsAndWarningsCheckbox).toBeInvalid();
      const acceptErrorsAndWarningsError = screen.getByRole("alert", {
        description: "Je kan alleen verder als je het papieren proces-verbaal hebt gecontroleerd.",
      });
      expect(acceptErrorsAndWarningsError).toBeVisible();

      const input = await screen.findByLabelText("H Totaal uitgebrachte stemmen");
      await user.type(input, "1");

      expect(acceptErrorsAndWarningsCheckbox).not.toBeVisible();
      expect(acceptErrorsAndWarningsError).not.toBeVisible();
    });

    test("error should not immediately disappear when checkbox is checked", async () => {
      expect(acceptErrorsAndWarningsCheckbox).toBeVisible();
      expect(acceptErrorsAndWarningsCheckbox).not.toBeInvalid();

      await user.click(submitButton);

      expect(acceptErrorsAndWarningsCheckbox).toBeInvalid();
      const acceptErrorsAndWarningsError = screen.getByRole("alert", {
        description: "Je kan alleen verder als je het papieren proces-verbaal hebt gecontroleerd.",
      });
      expect(acceptErrorsAndWarningsError).toBeVisible();

      await user.click(acceptErrorsAndWarningsCheckbox);
      expect(acceptErrorsAndWarningsCheckbox).toBeChecked();
      expect(acceptErrorsAndWarningsCheckbox).toBeInvalid();
      expect(acceptErrorsAndWarningsError).toBeVisible();
    });
  });

  describe("VotersAndVotesForm errors AND warnings", () => {
    test("Both errors and warning feedback should be shown", async () => {
      overrideOnce("post", "/api/polling_stations/1/data_entries/1", 200, {
        validation_results: {
          errors: [
            {
              fields: ["data.votes_counts.blank_votes_count"],
              code: "F201",
            },
          ],
          warnings: [{ fields: ["data.votes_counts.blank_votes_count"], code: "W201" }],
        },
      });

      renderForm();
      const submitButton = await screen.findByRole("button", { name: "Volgende" });
      await userEvent.click(submitButton);

      const errorFeedbackMessage = [
        "Controleer je antwoorden",
        "F.201",
        "Heb je iets niet goed overgenomen? Herstel de fout en ga verder.",
        "Heb je alles gecontroleerd en komt je invoer overeen met het papier? Ga dan verder.",
      ].join("");

      const warningFeedbackMessage = [
        "Controleer F",
        "W.201",
        "Heb je iets niet goed overgenomen? Herstel de fout en ga verder.",
        "Heb je alles gecontroleerd en komt je invoer overeen met het papier? Ga dan verder.",
      ].join("");

      expect(await screen.findByTestId("feedback-error")).toHaveTextContent(errorFeedbackMessage);
      expect(await screen.findByTestId("feedback-warning")).toHaveTextContent(warningFeedbackMessage);
    });
  });
});
