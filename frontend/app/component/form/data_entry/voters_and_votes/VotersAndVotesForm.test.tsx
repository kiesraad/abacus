import { userEvent } from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";

import {
  expectFieldsToBeInvalidAndToHaveAccessibleErrorMessage,
  expectFieldsToBeValidAndToNotHaveAccessibleErrorMessage,
  expectFieldsToHaveIconAndToHaveAccessibleName,
  expectFieldsToNotHaveIcon,
} from "app/component/form/testHelperFunctions";
import { getUrlMethodAndBody, overrideOnce, render, screen, userTypeInputs, waitFor } from "app/test/unit";
import { emptyDataEntryRequest } from "app/test/unit/form";

import {
  FormState,
  POLLING_STATION_DATA_ENTRY_SAVE_REQUEST_BODY,
  PollingStationFormController,
  PollingStationResults,
} from "@kiesraad/api";
import { electionMockData, pollingStationMockData } from "@kiesraad/api-mocks";

import { VotersAndVotesForm } from "./VotersAndVotesForm";

const defaultFormState: FormState = {
  current: "recounted",
  furthest: "recounted",
  sections: {
    recounted: {
      index: 0,
      id: "recounted",
      isSaved: true,
      acceptWarnings: false,
      errors: [],
      warnings: [],
    },
    voters_votes_counts: {
      index: 1,
      id: "voters_votes_counts",
      isSaved: true,
      acceptWarnings: false,
      errors: [],
      warnings: [],
    },
    differences_counts: {
      index: 2,
      id: "differences_counts",
      isSaved: true,
      acceptWarnings: false,
      errors: [],
      warnings: [],
    },
    save: {
      index: 3,
      id: "save",
      isSaved: true,
      acceptWarnings: false,
      errors: [],
      warnings: [],
    },
  },
};

function renderForm(defaultValues: Partial<PollingStationResults> = {}) {
  return render(
    <PollingStationFormController
      election={electionMockData}
      pollingStationId={pollingStationMockData.id}
      entryNumber={1}
      defaultValues={defaultValues}
      defaultFormState={defaultFormState}
    >
      <VotersAndVotesForm />
    </PollingStationFormController>,
  );
}

const votersFieldIds = {
  pollCardCount: "poll_card_count",
  proxyCertificateCount: "proxy_certificate_count",
  voterCardCount: "voter_card_count",
  totalAdmittedVotersCount: "total_admitted_voters_count",
};

const votesFieldIds = {
  votesCandidatesCount: "votes_candidates_count",
  blankVotesCount: "blank_votes_count",
  invalidVotesCount: "invalid_votes_count",
  totalVotesCastCount: "total_votes_cast_count",
};

const recountFieldIds = {
  pollCardRecount: "poll_card_recount",
  proxyCertificateRecount: "proxy_certificate_recount",
  voterCardRecount: "voter_card_recount",
  totalAdmittedVotersRecount: "total_admitted_voters_recount",
};

describe("Test VotersAndVotesForm", () => {
  describe("VotersAndVotesForm user interactions", () => {
    test("hitting enter key does not result in api call", async () => {
      const user = userEvent.setup();

      renderForm({ recounted: false });

      const pollCards = await screen.findByTestId("poll_card_count");
      await user.type(pollCards, "12345");
      expect(pollCards).toHaveValue("12345");

      const spy = vi.spyOn(global, "fetch");

      await user.keyboard("{enter}");

      expect(spy).not.toHaveBeenCalled();
    });

    test("hitting shift+enter does result in api call", async () => {
      const user = userEvent.setup();

      renderForm({ recounted: false });
      const spy = vi.spyOn(global, "fetch");

      const pollCards = await screen.findByTestId("poll_card_count");
      await user.type(pollCards, "12345");
      expect(pollCards).toHaveValue("12345");

      await user.keyboard("{shift>}{enter}{/shift}");

      expect(spy).toHaveBeenCalled();
    });

    test("Form field entry and keybindings", async () => {
      overrideOnce("post", "/api/polling_stations/1/data_entries/1", 200, {
        validation_results: { errors: [], warnings: [] },
      });

      const user = userEvent.setup();

      renderForm({ recounted: false });

      const formTitle = await screen.findByRole("heading", {
        level: 2,
        name: "Toegelaten kiezers en uitgebrachte stemmen",
      });
      expect(formTitle).toHaveFocus();
      await user.keyboard("{tab}");

      const pollCards = await screen.findByTestId("poll_card_count");
      expect(pollCards).toHaveFocus();
      await user.type(pollCards, "12345");
      expect(pollCards).toHaveValue("12345");

      await user.keyboard("{enter}");

      const proxyCertificates = screen.getByTestId("proxy_certificate_count");
      expect(proxyCertificates).toHaveFocus();
      await user.paste("6789");
      expect(proxyCertificates).toHaveValue("6789");

      await user.keyboard("{enter}");

      const voterCards = screen.getByTestId("voter_card_count");
      expect(voterCards).toHaveFocus();
      await user.type(voterCards, "123");
      expect(voterCards).toHaveValue("123");

      await user.keyboard("{enter}");

      const totalAdmittedVoters = screen.getByTestId("total_admitted_voters_count");
      expect(totalAdmittedVoters).toHaveFocus();
      await user.paste("4242");
      expect(totalAdmittedVoters).toHaveValue("4242");

      await user.keyboard("{enter}");

      const votesOnCandidates = screen.getByTestId("votes_candidates_count");
      expect(votesOnCandidates).toHaveFocus();
      await user.type(votesOnCandidates, "12");
      expect(votesOnCandidates).toHaveValue("12");

      await user.keyboard("{enter}");

      const blankVotes = screen.getByTestId("blank_votes_count");
      expect(blankVotes).toHaveFocus();
      // Test if maxLength on field works
      await user.type(blankVotes, "1234567890");
      expect(blankVotes).toHaveValue("123456789");

      await user.keyboard("{enter}");

      const invalidVotes = screen.getByTestId("invalid_votes_count");
      expect(invalidVotes).toHaveFocus();
      await user.type(invalidVotes, "3");
      expect(invalidVotes).toHaveValue("3");

      await user.keyboard("{enter}");

      const totalVotesCast = screen.getByTestId("total_votes_cast_count");
      expect(totalVotesCast).toHaveFocus();
      await user.type(totalVotesCast, "555");
      expect(totalVotesCast).toHaveValue("555");

      const submitButton = screen.getByRole("button", { name: "Volgende" });
      await user.click(submitButton);
    });
  });

  describe("VotersAndVotesForm API request and response", () => {
    test("VotersAndVotesForm request body is equal to the form data", async () => {
      const expectedRequest = {
        data: {
          ...emptyDataEntryRequest.data,
          recounted: false,
          voters_counts: {
            poll_card_count: 1,
            proxy_certificate_count: 2,
            voter_card_count: 3,
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

      renderForm({ recounted: false });

      await userTypeInputs(user, {
        ...expectedRequest.data.voters_counts,
        ...expectedRequest.data.votes_counts,
      });

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
    test("F.201 IncorrectTotal Voters counts", async () => {
      const user = userEvent.setup();

      renderForm({ recounted: false });

      await screen.findByTestId("voters_and_votes_form");
      overrideOnce("post", "/api/polling_stations/1/data_entries/1", 200, {
        validation_results: {
          errors: [
            {
              fields: [
                "data.voters_counts.total_admitted_voters_count",
                "data.voters_counts.poll_card_count",
                "data.voters_counts.proxy_certificate_count",
                "data.voters_counts.voter_card_count",
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
        "Controleer toegelaten kiezersF.201De invoer bij A, B, C of D klopt niet.Check of je het papieren proces-verbaal goed hebt overgenomen.Heb je iets niet goed overgenomen? Herstel de fout en ga verder.Heb je alles goed overgenomen, en blijft de fout? Dan mag je niet verder. Overleg met de coördinator.";
      expect(await screen.findByTestId("feedback-error")).toHaveTextContent(feedbackMessage);
      expect(screen.queryByTestId("feedback-warning")).toBeNull();
      const expectedInvalidFieldIds = [
        votersFieldIds.pollCardCount,
        votersFieldIds.proxyCertificateCount,
        votersFieldIds.voterCardCount,
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

      renderForm({ recounted: false });

      await screen.findByTestId("voters_and_votes_form");
      overrideOnce("post", "/api/polling_stations/1/data_entries/1", 200, {
        validation_results: {
          errors: [
            {
              fields: [
                "data.votes_counts.total_votes_cast_count",
                "data.votes_counts.votes_candidates_count",
                "data.votes_counts.blank_votes_count",
                "data.votes_counts.invalid_votes_count",
              ],
              code: "F202",
            },
          ],
          warnings: [],
        },
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
        votersFieldIds.voterCardCount,
        votersFieldIds.totalAdmittedVotersCount,
      ];
      expectFieldsToBeInvalidAndToHaveAccessibleErrorMessage(expectedInvalidFieldIds, feedbackMessage);
      expectFieldsToHaveIconAndToHaveAccessibleName(expectedInvalidFieldIds, "bevat een fout");
      expectFieldsToBeValidAndToNotHaveAccessibleErrorMessage(expectedValidFieldIds);
      expectFieldsToNotHaveIcon(expectedValidFieldIds);
    });

    test("F.203 IncorrectTotal Voters recounts", async () => {
      const user = userEvent.setup();

      renderForm({ recounted: true });

      await screen.findByTestId("voters_and_votes_form");
      overrideOnce("post", "/api/polling_stations/1/data_entries/1", 200, {
        validation_results: {
          errors: [
            {
              fields: [
                "data.voters_recounts.total_admitted_voters_recount",
                "data.voters_recounts.poll_card_recount",
                "data.voters_recounts.proxy_certificate_recount",
                "data.voters_recounts.voter_card_recount",
              ],
              code: "F203",
            },
          ],
          warnings: [],
        },
      });

      const submitButton = await screen.findByRole("button", { name: "Volgende" });
      await user.click(submitButton);

      const feedbackMessage =
        "Controleer hertelde toegelaten kiezersF.203De invoer bij A.2, B.2, C.2 of D.2 klopt niet.Check of je het papieren proces-verbaal goed hebt overgenomen.Heb je iets niet goed overgenomen? Herstel de fout en ga verder.Heb je alles goed overgenomen, en blijft de fout? Dan mag je niet verder. Overleg met de coördinator.";
      expect(await screen.findByTestId("feedback-error")).toHaveTextContent(feedbackMessage);
      expect(screen.queryByTestId("feedback-warning")).toBeNull();

      const expectedInvalidFieldIds = [
        recountFieldIds.pollCardRecount,
        recountFieldIds.proxyCertificateRecount,
        recountFieldIds.voterCardRecount,
        recountFieldIds.totalAdmittedVotersRecount,
      ];
      const expectedValidFieldIds = [
        votersFieldIds.pollCardCount,
        votersFieldIds.proxyCertificateCount,
        votersFieldIds.voterCardCount,
        votersFieldIds.totalAdmittedVotersCount,
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
  });

  describe("VotersAndVotesForm warnings", () => {
    test("clicking next without accepting warning results in alert shown and then accept warning", async () => {
      const user = userEvent.setup();

      renderForm({ recounted: false });

      await screen.findByTestId("voters_and_votes_form");
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
      const feedbackWarning = await screen.findByTestId("feedback-warning");
      expect(feedbackWarning).toHaveTextContent(feedbackMessage);
      expect(screen.queryByTestId("feedback-error")).toBeNull();
      const expectedInvalidFieldIds = [votesFieldIds.blankVotesCount];
      let expectedValidFieldIds = [
        votersFieldIds.pollCardCount,
        votersFieldIds.proxyCertificateCount,
        votersFieldIds.voterCardCount,
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
        name: "Ik heb de aantallen gecontroleerd met het papier en correct overgenomen.",
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

      await user.clear(screen.getByTestId("blank_votes_count"));
      await user.type(screen.getByTestId("blank_votes_count"), "100");
      await user.tab();
      expect(screen.getByTestId("blank_votes_count"), "100").toHaveValue("100");
      await user.clear(screen.getByTestId("blank_votes_count"));

      await waitFor(() => expect(acceptFeedbackCheckbox).not.toBeInTheDocument());

      overrideOnce("post", "/api/polling_stations/1/data_entries/1", 200, {
        validation_results: {
          errors: [],
          warnings: [{ fields: ["data.votes_counts.blank_votes_count"], code: "W201" }],
        },
      });

      await user.click(submitButton);

      acceptFeedbackCheckbox = screen.getByRole("checkbox", {
        name: "Ik heb de aantallen gecontroleerd met het papier en correct overgenomen.",
      });
      expect(acceptFeedbackCheckbox).toBeVisible();
      expect(acceptFeedbackCheckbox).not.toBeChecked();
      acceptFeedbackCheckbox.click();
      expect(acceptFeedbackCheckbox).toBeChecked();

      await user.click(submitButton);

      expect(feedbackWarning).toHaveTextContent(feedbackMessage);
      // All fields should be considered valid now
      expectedValidFieldIds = expectedValidFieldIds.concat(expectedInvalidFieldIds);
      expectFieldsToBeValidAndToNotHaveAccessibleErrorMessage(expectedValidFieldIds);
      expectFieldsToNotHaveIcon(expectedValidFieldIds);
    });

    test("W.201 high number of blank votes", async () => {
      const user = userEvent.setup();

      renderForm({ recounted: false });

      await screen.findByTestId("voters_and_votes_form");
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
        votersFieldIds.voterCardCount,
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

      renderForm({ recounted: false });

      await screen.findByTestId("voters_and_votes_form");
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
        votersFieldIds.voterCardCount,
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

      renderForm({ recounted: false });

      await screen.findByTestId("voters_and_votes_form");
      overrideOnce("post", "/api/polling_stations/1/data_entries/1", 200, {
        validation_results: {
          errors: [],
          warnings: [
            {
              fields: ["data.votes_counts.total_votes_cast_count", "data.voters_counts.total_admitted_voters_count"],
              code: "W203",
            },
          ],
        },
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
        votersFieldIds.voterCardCount,
        votesFieldIds.votesCandidatesCount,
        votesFieldIds.blankVotesCount,
        votesFieldIds.invalidVotesCount,
      ];
      expectFieldsToBeInvalidAndToHaveAccessibleErrorMessage(expectedInvalidFieldIds, feedbackMessage);
      expectFieldsToHaveIconAndToHaveAccessibleName(expectedInvalidFieldIds, "bevat een waarschuwing");
      expectFieldsToBeValidAndToNotHaveAccessibleErrorMessage(expectedValidFieldIds);
      expectFieldsToNotHaveIcon(expectedValidFieldIds);
    });

    test("W.204 votes counts and voters recounts difference above threshold", async () => {
      const user = userEvent.setup();

      renderForm({ recounted: true });

      await screen.findByTestId("voters_and_votes_form");
      overrideOnce("post", "/api/polling_stations/1/data_entries/1", 200, {
        validation_results: {
          errors: [],
          warnings: [
            {
              fields: [
                "data.votes_counts.total_votes_cast_count",
                "data.voters_recounts.total_admitted_voters_recount",
              ],
              code: "W204",
            },
          ],
        },
      });

      const submitButton = await screen.findByRole("button", { name: "Volgende" });
      await user.click(submitButton);

      const feedbackMessage =
        "Controleer aantal uitgebrachte stemmen en herteld aantal toegelaten kiezersW.204Er is een onverwacht verschil tussen het aantal uitgebrachte stemmen (E t/m H) en het herteld aantal toegelaten kiezers (A.2 t/m D.2).Check of je het papieren proces-verbaal goed hebt overgenomen.Heb je iets niet goed overgenomen? Herstel de fout en ga verder.Heb je alles gecontroleerd en komt je invoer overeen met het papier? Ga dan verder.";
      expect(await screen.findByTestId("feedback-warning")).toHaveTextContent(feedbackMessage);
      expect(screen.queryByTestId("feedback-error")).toBeNull();

      const expectedInvalidFieldIds = [votesFieldIds.totalVotesCastCount, recountFieldIds.totalAdmittedVotersRecount];
      const expectedValidFieldIds = [
        votersFieldIds.pollCardCount,
        votersFieldIds.proxyCertificateCount,
        votersFieldIds.voterCardCount,
        votersFieldIds.totalAdmittedVotersCount,
        votesFieldIds.votesCandidatesCount,
        votesFieldIds.blankVotesCount,
        votesFieldIds.invalidVotesCount,
        recountFieldIds.pollCardRecount,
        recountFieldIds.proxyCertificateRecount,
        recountFieldIds.voterCardRecount,
      ];
      expectFieldsToBeInvalidAndToHaveAccessibleErrorMessage(expectedInvalidFieldIds, feedbackMessage);
      expectFieldsToHaveIconAndToHaveAccessibleName(expectedInvalidFieldIds, "bevat een waarschuwing");
      expectFieldsToBeValidAndToNotHaveAccessibleErrorMessage(expectedValidFieldIds);
      expectFieldsToNotHaveIcon(expectedValidFieldIds);
    });

    test("W.205 total votes cast should not be zero", async () => {
      const user = userEvent.setup();

      renderForm({ recounted: false });

      await screen.findByTestId("voters_and_votes_form");
      overrideOnce("post", "/api/polling_stations/1/data_entries/1", 200, {
        validation_results: {
          errors: [],
          warnings: [{ fields: ["data.votes_counts.total_votes_cast_count"], code: "W205" }],
        },
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
        votersFieldIds.voterCardCount,
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

    test("W.206 total admitted voters and total votes cast should not exceed polling stations number of eligible voters", async () => {
      const user = userEvent.setup();

      renderForm({ recounted: false });

      await screen.findByTestId("voters_and_votes_form");
      overrideOnce("post", "/api/polling_stations/1/data_entries/1", 200, {
        validation_results: {
          errors: [],
          warnings: [
            {
              fields: ["data.votes_counts.total_votes_cast_count", "data.voters_counts.total_admitted_voters_count"],
              code: "W206",
            },
          ],
        },
      });

      const submitButton = await screen.findByRole("button", { name: "Volgende" });
      await user.click(submitButton);

      const feedbackMessage =
        "Controleer aantal toegelaten kiezers en aantal uitgebrachte stemmenW.206Het totaal aantal toegelaten kiezers (D) en/of het totaal aantal uitgebrachte stemmen (H) is hoger dan het aantal kiesgerechtigden voor dit stembureau.Check of je het papieren proces-verbaal goed hebt overgenomen.Heb je iets niet goed overgenomen? Herstel de fout en ga verder.Heb je alles gecontroleerd en komt je invoer overeen met het papier? Ga dan verder.";
      expect(await screen.findByTestId("feedback-warning")).toHaveTextContent(feedbackMessage);
      expect(screen.queryByTestId("feedback-error")).toBeNull();
      const expectedInvalidFieldIds = [votersFieldIds.totalAdmittedVotersCount, votesFieldIds.totalVotesCastCount];
      const expectedValidFieldIds = [
        votersFieldIds.pollCardCount,
        votersFieldIds.proxyCertificateCount,
        votersFieldIds.voterCardCount,
        votesFieldIds.votesCandidatesCount,
        votesFieldIds.blankVotesCount,
        votesFieldIds.invalidVotesCount,
      ];
      expectFieldsToBeInvalidAndToHaveAccessibleErrorMessage(expectedInvalidFieldIds, feedbackMessage);
      expectFieldsToHaveIconAndToHaveAccessibleName(expectedInvalidFieldIds, "bevat een waarschuwing");
      expectFieldsToBeValidAndToNotHaveAccessibleErrorMessage(expectedValidFieldIds);
      expectFieldsToNotHaveIcon(expectedValidFieldIds);
    });

    test("W.207 total votes cast and total admitted voters recount should not exceed polling stations number of eligible voters", async () => {
      const user = userEvent.setup();

      renderForm({ recounted: true });

      await screen.findByTestId("voters_and_votes_form");
      overrideOnce("post", "/api/polling_stations/1/data_entries/1", 200, {
        validation_results: {
          errors: [],
          warnings: [
            {
              fields: [
                "data.votes_counts.total_votes_cast_count",
                "data.voters_recounts.total_admitted_voters_recount",
              ],
              code: "W207",
            },
          ],
        },
      });

      const submitButton = await screen.findByRole("button", { name: "Volgende" });
      await user.click(submitButton);

      const feedbackMessage =
        "Controleer aantal uitgebrachte stemmen en herteld aantal toegelaten kiezersW.207Het totaal aantal uitgebrachte stemmen (H) en/of het herteld totaal aantal toegelaten kiezers (D.2) is hoger dan het aantal kiesgerechtigden voor dit stembureau.Check of je het papieren proces-verbaal goed hebt overgenomen.Heb je iets niet goed overgenomen? Herstel de fout en ga verder.Heb je alles gecontroleerd en komt je invoer overeen met het papier? Ga dan verder.";
      expect(await screen.findByTestId("feedback-warning")).toHaveTextContent(feedbackMessage);
      expect(screen.queryByTestId("feedback-error")).toBeNull();
      const expectedInvalidFieldIds = [votesFieldIds.totalVotesCastCount, recountFieldIds.totalAdmittedVotersRecount];
      const expectedValidFieldIds = [
        votersFieldIds.pollCardCount,
        votersFieldIds.proxyCertificateCount,
        votersFieldIds.voterCardCount,
        votersFieldIds.totalAdmittedVotersCount,
        votesFieldIds.votesCandidatesCount,
        votesFieldIds.blankVotesCount,
        votesFieldIds.invalidVotesCount,
        recountFieldIds.pollCardRecount,
        recountFieldIds.proxyCertificateRecount,
        recountFieldIds.voterCardRecount,
      ];
      expectFieldsToBeInvalidAndToHaveAccessibleErrorMessage(expectedInvalidFieldIds, feedbackMessage);
      expectFieldsToHaveIconAndToHaveAccessibleName(expectedInvalidFieldIds, "bevat een waarschuwing");
      expectFieldsToBeValidAndToNotHaveAccessibleErrorMessage(expectedValidFieldIds);
      expectFieldsToNotHaveIcon(expectedValidFieldIds);
    });

    test("W.208 EqualInput voters counts and votes counts", async () => {
      const user = userEvent.setup();

      renderForm({ recounted: false });

      await screen.findByTestId("voters_and_votes_form");
      overrideOnce("post", "/api/polling_stations/1/data_entries/1", 200, {
        validation_results: {
          errors: [],
          warnings: [
            {
              fields: ["data.voters_counts", "data.votes_counts"],
              code: "W208",
            },
          ],
        },
      });

      const submitButton = await screen.findByRole("button", { name: "Volgende" });
      await user.click(submitButton);

      const feedbackMessage =
        "Controleer A t/m D en E t/m HW.208De getallen bij A t/m D zijn precies hetzelfde als E t/m H.Check of je het papieren proces-verbaal goed hebt overgenomen.Heb je iets niet goed overgenomen? Herstel de fout en ga verder.Heb je alles gecontroleerd en komt je invoer overeen met het papier? Ga dan verder.";
      expect(await screen.findByTestId("feedback-warning")).toHaveTextContent(feedbackMessage);
      expect(screen.queryByTestId("feedback-error")).toBeNull();
      // When all fields on a page are (potentially) invalid, we do not mark them as so
      const expectedValidFieldIds = [
        votersFieldIds.pollCardCount,
        votersFieldIds.proxyCertificateCount,
        votersFieldIds.voterCardCount,
        votersFieldIds.totalAdmittedVotersCount,
        votesFieldIds.votesCandidatesCount,
        votesFieldIds.blankVotesCount,
        votesFieldIds.invalidVotesCount,
        votesFieldIds.totalVotesCastCount,
      ];
      expectFieldsToBeValidAndToNotHaveAccessibleErrorMessage(expectedValidFieldIds);
      expectFieldsToNotHaveIcon(expectedValidFieldIds);
    });

    test("W.209 EqualInput voters recounts and votes counts", async () => {
      const user = userEvent.setup();

      renderForm({ recounted: true });

      await screen.findByTestId("voters_and_votes_form");
      overrideOnce("post", "/api/polling_stations/1/data_entries/1", 200, {
        validation_results: {
          errors: [],
          warnings: [
            {
              fields: [
                "data.votes_counts.votes_candidates_count",
                "data.votes_counts.blank_votes_count",
                "data.votes_counts.invalid_votes_count",
                "data.votes_counts.total_votes_cast_count",
                "data.voters_recounts.poll_card_recount",
                "data.voters_recounts.proxy_certificate_recount",
                "data.voters_recounts.voter_card_recount",
                "data.voters_recounts.total_admitted_voters_recount",
              ],
              code: "W209",
            },
          ],
        },
      });

      const submitButton = await screen.findByRole("button", { name: "Volgende" });
      await user.click(submitButton);

      const feedbackMessage =
        "Controleer E t/m H en A.2 t/m D.2W.209De getallen bij E t/m H zijn precies hetzelfde als A.2 t/m D.2.Check of je het papieren proces-verbaal goed hebt overgenomen.Heb je iets niet goed overgenomen? Herstel de fout en ga verder.Heb je alles gecontroleerd en komt je invoer overeen met het papier? Ga dan verder.";
      expect(await screen.findByTestId("feedback-warning")).toHaveTextContent(feedbackMessage);
      expect(screen.queryByTestId("feedback-error")).toBeNull();
      const expectedInvalidFieldIds = [
        votesFieldIds.votesCandidatesCount,
        votesFieldIds.blankVotesCount,
        votesFieldIds.invalidVotesCount,
        votesFieldIds.totalVotesCastCount,
        recountFieldIds.pollCardRecount,
        recountFieldIds.proxyCertificateRecount,
        recountFieldIds.voterCardRecount,
        recountFieldIds.totalAdmittedVotersRecount,
      ];
      const expectedValidFieldIds = [
        votersFieldIds.pollCardCount,
        votersFieldIds.proxyCertificateCount,
        votersFieldIds.voterCardCount,
        votersFieldIds.totalAdmittedVotersCount,
      ];
      expectFieldsToBeInvalidAndToHaveAccessibleErrorMessage(expectedInvalidFieldIds, feedbackMessage);
      expectFieldsToHaveIconAndToHaveAccessibleName(expectedInvalidFieldIds, "bevat een waarschuwing");
      expectFieldsToBeValidAndToNotHaveAccessibleErrorMessage(expectedValidFieldIds);
      expectFieldsToNotHaveIcon(expectedValidFieldIds);
    });
  });
});
