import { useParams } from "react-router";

import { userEvent, UserEvent } from "@testing-library/user-event";
import { beforeEach, describe, expect, Mock, test, vi } from "vitest";

import { useUser } from "@/hooks/user/useUser";
import { electionMockData } from "@/testing/api-mocks/ElectionMockData";
import {
  PollingStationDataEntryClaimHandler,
  PollingStationDataEntrySaveHandler,
} from "@/testing/api-mocks/RequestHandlers";
import { validationResultMockData } from "@/testing/api-mocks/ValidationResultMockData";
import { overrideOnce, server } from "@/testing/server";
import { getUrlMethodAndBody, render, screen, userTypeInputs, waitFor } from "@/testing/test-utils";
import { LoginResponse, POLLING_STATION_DATA_ENTRY_SAVE_REQUEST_BODY } from "@/types/generated/openapi";

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

vi.mock("@/hooks/user/useUser");
vi.mock("react-router");

const testUser: LoginResponse = {
  username: "test-user-1",
  user_id: 1,
  role: "typist",
  needs_password_change: false,
};

function renderForm() {
  vi.mocked(useParams).mockReturnValue({ sectionId: "voters_votes_counts" });

  return render(
    <DataEntryProvider election={electionMockData} pollingStationId={1} entryNumber={1}>
      <DataEntrySection />
    </DataEntryProvider>,
  );
}

const votersFieldIds = {
  pollCardCount: "data.voters_counts.poll_card_count",
  proxyCertificateCount: "data.voters_counts.proxy_certificate_count",
  totalAdmittedVotersCount: "data.voters_counts.total_admitted_voters_count",
};

const votesFieldIds = {
  votesCandidatesCount: "data.votes_counts.votes_candidates_count",
  blankVotesCount: "data.votes_counts.blank_votes_count",
  invalidVotesCount: "data.votes_counts.invalid_votes_count",
  totalVotesCastCount: "data.votes_counts.total_votes_cast_count",
};

describe("Test VotersAndVotesForm", () => {
  beforeEach(() => {
    (useUser as Mock).mockReturnValue(testUser satisfies LoginResponse);
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

      expect(pollCards).toHaveValue("12.345");
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

      const votesOnCandidates = screen.getByRole("textbox", { name: "E Stemmen op kandidaten" });
      expect(votesOnCandidates).toHaveFocus();
      await user.type(votesOnCandidates, "12");
      expect(votesOnCandidates).toHaveValue("12");

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
            votes_candidates_count: 4,
            blank_votes_count: 5,
            invalid_votes_count: 6,
            total_votes_cast_count: 15,
          },
        },
        client_state: {},
      };

      const user = userEvent.setup();
      overrideServerClaimDataEntryResponse({
        formState: getDefaultDataEntryState().formState,
        pollingStationResults: {},
      });
      renderForm();

      await userTypeInputs(user, expectedRequest.data.voters_counts, "data.voters_counts.");
      await userTypeInputs(user, expectedRequest.data.votes_counts, "data.votes_counts.");

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

      const feedbackMessage =
        "Controleer toegelaten kiezersF.201De invoer bij A, B of D klopt niet.Check of je het papieren proces-verbaal goed hebt overgenomen.Heb je iets niet goed overgenomen? Herstel de fout en ga verder.Heb je alles goed overgenomen, en blijft de fout? Dan mag je niet verder. Overleg met de coördinator.";
      expect(await screen.findByTestId("feedback-error")).toHaveTextContent(feedbackMessage);
      expect(screen.queryByTestId("feedback-warning")).toBeNull();
      const expectedInvalidFieldIds = [
        votersFieldIds.pollCardCount,
        votersFieldIds.proxyCertificateCount,
        votersFieldIds.totalAdmittedVotersCount,
      ];
      const expectedValidFieldIds = [
        votesFieldIds.votesCandidatesCount,
        votesFieldIds.blankVotesCount,
        votesFieldIds.invalidVotesCount,
        votesFieldIds.totalVotesCastCount,
      ];
      expectFieldsToBeInvalidAndToHaveAccessibleErrorMessage(expectedInvalidFieldIds, feedbackMessage);
      expectFieldsToHaveIconAndToHaveAccessibleName(expectedInvalidFieldIds, "bevat een fout");
      expectFieldsToBeValidAndToNotHaveAccessibleErrorMessage(expectedValidFieldIds);
      expectFieldsToNotHaveIcon(expectedValidFieldIds);
    });

    test("F.202 IncorrectTotal Votes counts", async () => {
      const user = userEvent.setup();

      renderForm();

      await screen.findByTestId("voters_votes_counts_form");
      overrideOnce("post", "/api/polling_stations/1/data_entries/1", 200, {
        validation_results: { errors: [validationResultMockData.F202], warnings: [] },
      });

      const submitButton = await screen.findByRole("button", { name: "Volgende" });
      await user.click(submitButton);

      const feedbackMessage =
        "Controleer uitgebrachte stemmenF.202De invoer bij E, F, G of H klopt niet.Check of je het papieren proces-verbaal goed hebt overgenomen.Heb je iets niet goed overgenomen? Herstel de fout en ga verder.Heb je alles goed overgenomen, en blijft de fout? Dan mag je niet verder. Overleg met de coördinator.";
      expect(await screen.findByTestId("feedback-error")).toHaveTextContent(feedbackMessage);
      expect(screen.queryByTestId("feedback-warning")).toBeNull();
      const expectedInvalidFieldIds = [
        votesFieldIds.votesCandidatesCount,
        votesFieldIds.blankVotesCount,
        votesFieldIds.invalidVotesCount,
        votesFieldIds.totalVotesCastCount,
      ];
      const expectedValidFieldIds = [
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

      const feedbackMessage =
        "Controleer aantal blanco stemmenW.201Het aantal blanco stemmen is erg hoog.Check of je het papieren proces-verbaal goed hebt overgenomen.Heb je iets niet goed overgenomen? Herstel de fout en ga verder.Heb je alles gecontroleerd en komt je invoer overeen met het papier? Ga dan verder.";
      const feedbackWarning = await screen.findByTestId("feedback-warning");
      expect(feedbackWarning).toHaveTextContent(feedbackMessage);
      expect(screen.queryByTestId("feedback-error")).toBeNull();
      const expectedInvalidFieldIds = [votesFieldIds.blankVotesCount];
      const expectedValidFieldIds = [
        votersFieldIds.pollCardCount,
        votersFieldIds.proxyCertificateCount,
        votersFieldIds.totalAdmittedVotersCount,
        votesFieldIds.votesCandidatesCount,
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

      const feedbackMessage =
        "Controleer aantal blanco stemmenW.201Het aantal blanco stemmen is erg hoog.Check of je het papieren proces-verbaal goed hebt overgenomen.Heb je iets niet goed overgenomen? Herstel de fout en ga verder.Heb je alles gecontroleerd en komt je invoer overeen met het papier? Ga dan verder.";
      expect(await screen.findByTestId("feedback-warning")).toHaveTextContent(feedbackMessage);
      expect(screen.queryByTestId("feedback-error")).toBeNull();
      const expectedInvalidFieldIds = [votesFieldIds.blankVotesCount];
      const expectedValidFieldIds = [
        votersFieldIds.pollCardCount,
        votersFieldIds.proxyCertificateCount,
        votersFieldIds.totalAdmittedVotersCount,
        votesFieldIds.votesCandidatesCount,
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

      const feedbackMessage =
        "Controleer aantal ongeldige stemmenW.202Het aantal ongeldige stemmen is erg hoog.Check of je het papieren proces-verbaal goed hebt overgenomen.Heb je iets niet goed overgenomen? Herstel de fout en ga verder.Heb je alles gecontroleerd en komt je invoer overeen met het papier? Ga dan verder.";
      expect(await screen.findByTestId("feedback-warning")).toHaveTextContent(feedbackMessage);
      expect(screen.queryByTestId("feedback-error")).toBeNull();
      const expectedInvalidFieldIds = [votesFieldIds.invalidVotesCount];
      const expectedValidFieldIds = [
        votersFieldIds.pollCardCount,
        votersFieldIds.proxyCertificateCount,
        votersFieldIds.totalAdmittedVotersCount,
        votesFieldIds.votesCandidatesCount,
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

      const feedbackMessage =
        "Controleer aantal toegelaten kiezers en aantal uitgebrachte stemmenW.203Er is een onverwacht verschil tussen het aantal toegelaten kiezers (A t/m D) en het aantal uitgebrachte stemmen (E t/m H).Check of je het papieren proces-verbaal goed hebt overgenomen.Heb je iets niet goed overgenomen? Herstel de fout en ga verder.Heb je alles gecontroleerd en komt je invoer overeen met het papier? Ga dan verder.";
      expect(await screen.findByTestId("feedback-warning")).toHaveTextContent(feedbackMessage);
      expect(screen.queryByTestId("feedback-error")).toBeNull();
      const expectedInvalidFieldIds = [votesFieldIds.totalVotesCastCount, votersFieldIds.totalAdmittedVotersCount];
      const expectedValidFieldIds = [
        votersFieldIds.pollCardCount,
        votersFieldIds.proxyCertificateCount,
        votesFieldIds.votesCandidatesCount,
        votesFieldIds.blankVotesCount,
        votesFieldIds.invalidVotesCount,
      ];
      expectFieldsToBeInvalidAndToHaveAccessibleErrorMessage(expectedInvalidFieldIds, feedbackMessage);
      expectFieldsToHaveIconAndToHaveAccessibleName(expectedInvalidFieldIds, "bevat een waarschuwing");
      expectFieldsToBeValidAndToNotHaveAccessibleErrorMessage(expectedValidFieldIds);
      expectFieldsToNotHaveIcon(expectedValidFieldIds);
    });

    test("W.205 total votes cast should not be zero", async () => {
      const user = userEvent.setup();

      renderForm();

      await screen.findByTestId("voters_votes_counts_form");
      overrideOnce("post", "/api/polling_stations/1/data_entries/1", 200, {
        validation_results: { errors: [], warnings: [validationResultMockData.W205] },
      });

      const submitButton = await screen.findByRole("button", { name: "Volgende" });
      await user.click(submitButton);

      const feedbackMessage =
        "Controleer aantal uitgebrachte stemmenW.205Het totaal aantal uitgebrachte stemmen (H) is nul.Check of je het papieren proces-verbaal goed hebt overgenomen.Heb je iets niet goed overgenomen? Herstel de fout en ga verder.Heb je alles gecontroleerd en komt je invoer overeen met het papier? Ga dan verder.";
      expect(await screen.findByTestId("feedback-warning")).toHaveTextContent(feedbackMessage);
      expect(screen.queryByTestId("feedback-error")).toBeNull();
      const expectedInvalidFieldIds = [votesFieldIds.totalVotesCastCount];
      const expectedValidFieldIds = [
        votersFieldIds.pollCardCount,
        votersFieldIds.proxyCertificateCount,
        votersFieldIds.totalAdmittedVotersCount,
        votesFieldIds.votesCandidatesCount,
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

      const errorFeedbackMessage =
        "Controleer toegelaten kiezersF.201De invoer bij A, B of D klopt niet.Check of je het papieren proces-verbaal goed hebt overgenomen.Heb je iets niet goed overgenomen? Herstel de fout en ga verder.Heb je alles goed overgenomen, en blijft de fout? Dan mag je niet verder. Overleg met de coördinator.";
      const warningFeedbackMessage =
        "Controleer aantal blanco stemmenW.201Het aantal blanco stemmen is erg hoog.Check of je het papieren proces-verbaal goed hebt overgenomen.Heb je iets niet goed overgenomen? Herstel de fout en ga verder.Heb je alles gecontroleerd en komt je invoer overeen met het papier? Ga dan verder.";

      expect(await screen.findByTestId("feedback-error")).toHaveTextContent(errorFeedbackMessage);
      expect(await screen.findByTestId("feedback-warning")).toHaveTextContent(warningFeedbackMessage);
    });
  });
});
