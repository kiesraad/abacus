import { within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";

import { getUrlMethodAndBody, overrideOnce, render, screen, userTypeInputs } from "app/test/unit";
import { emptyDataEntryRequest } from "app/test/unit/form.ts";

import { FormState, PollingStationFormController, PollingStationValues } from "@kiesraad/api";
import { electionMockData, pollingStationMockData } from "@kiesraad/api-mocks";

import { VotersAndVotesForm } from "./VotersAndVotesForm";

const defaultFormState: FormState = {
  active: "recounted",
  current: "recounted",
  sections: {
    recounted: {
      index: 0,
      id: "recounted",
      isSaved: true,
      ignoreWarnings: false,
      errors: [],
      warnings: [],
    },
    voters_votes_counts: {
      index: 1,
      id: "voters_votes_counts",
      isSaved: true,
      ignoreWarnings: false,
      errors: [],
      warnings: [],
    },
    differences_counts: {
      index: 2,
      id: "differences_counts",
      isSaved: true,
      ignoreWarnings: false,
      errors: [],
      warnings: [],
    },
    save: {
      index: 3,
      id: "save",
      isSaved: true,
      ignoreWarnings: false,
      errors: [],
      warnings: [],
    },
  },
  unknown: {
    errors: [],
    warnings: [],
  },
  isCompleted: false,
};

function renderForm(defaultValues: Partial<PollingStationValues> = {}) {
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

describe("Test VotersAndVotesForm", () => {
  describe("VotersAndVotesForm user interactions", () => {
    test("hitting enter key does not result in api call", async () => {
      const user = userEvent.setup();

      renderForm({ recounted: false });
      const spy = vi.spyOn(global, "fetch");

      const pollCards = await screen.findByTestId("poll_card_count");
      await user.type(pollCards, "12345");
      expect(pollCards).toHaveValue("12.345");

      await user.keyboard("{enter}");

      expect(spy).not.toHaveBeenCalled();
    });

    test("hitting shift+enter does result in api call", async () => {
      const user = userEvent.setup();

      renderForm({ recounted: false });
      const spy = vi.spyOn(global, "fetch");

      const pollCards = await screen.findByTestId("poll_card_count");
      await user.type(pollCards, "12345");
      expect(pollCards).toHaveValue("12.345");

      await user.keyboard("{shift>}{enter}{/shift}");

      expect(spy).toHaveBeenCalled();
    });

    test("Form field entry and keybindings", async () => {
      overrideOnce("post", "/api/polling_stations/1/data_entries/1", 200, {
        validation_results: { errors: [], warnings: [] },
      });

      const user = userEvent.setup();

      renderForm({ recounted: false });

      const pollCards = await screen.findByTestId("poll_card_count");
      expect(pollCards).toHaveFocus();
      await user.type(pollCards, "12345");
      expect(pollCards).toHaveValue("12.345");

      await user.keyboard("{enter}");

      const proxyCertificates = screen.getByTestId("proxy_certificate_count");
      expect(proxyCertificates).toHaveFocus();
      await user.paste("6789");
      expect(proxyCertificates).toHaveValue("6.789");

      await user.keyboard("{enter}");

      const voterCards = screen.getByTestId("voter_card_count");
      expect(voterCards).toHaveFocus();
      await user.type(voterCards, "123");
      expect(voterCards).toHaveValue("123");

      await user.keyboard("{enter}");

      const totalAdmittedVoters = screen.getByTestId("total_admitted_voters_count");
      expect(totalAdmittedVoters).toHaveFocus();
      await user.paste("4242");
      expect(totalAdmittedVoters).toHaveValue("4.242");

      await user.keyboard("{enter}");

      const votesOnCandidates = screen.getByTestId("votes_candidates_counts");
      expect(votesOnCandidates).toHaveFocus();
      await user.type(votesOnCandidates, "12");
      expect(votesOnCandidates).toHaveValue("12");

      await user.keyboard("{enter}");

      const blankVotes = screen.getByTestId("blank_votes_count");
      expect(blankVotes).toHaveFocus();
      // Test if maxLength on field works
      await user.type(blankVotes, "1000000000");
      expect(blankVotes).toHaveValue("100.000.000");

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
          voters_counts: {
            poll_card_count: 1,
            proxy_certificate_count: 2,
            voter_card_count: 3,
            total_admitted_voters_count: 6,
          },
          votes_counts: {
            votes_candidates_counts: 4,
            blank_votes_count: 5,
            invalid_votes_count: 6,
            total_votes_cast_count: 15,
          },
        },
      };

      const user = userEvent.setup();

      renderForm({ recounted: false });
      const spy = vi.spyOn(global, "fetch");

      await userTypeInputs(user, {
        ...expectedRequest.data.voters_counts,
        ...expectedRequest.data.votes_counts,
      });

      const submitButton = screen.getByRole("button", { name: "Volgende" });
      await user.click(submitButton);

      expect(screen.getByTestId("poll_card_count")).toBeValid();
      expect(screen.getByTestId("proxy_certificate_count")).toBeValid();
      expect(screen.getByTestId("voter_card_count")).toBeValid();
      expect(screen.getByTestId("total_admitted_voters_count")).toBeValid();
      expect(screen.getByTestId("votes_candidates_counts")).toBeValid();
      expect(screen.getByTestId("blank_votes_count")).toBeValid();
      expect(screen.getByTestId("invalid_votes_count")).toBeValid();
      expect(screen.getByTestId("total_votes_cast_count")).toBeValid();

      expect(spy).toHaveBeenCalled();
      const { url, method, body } = getUrlMethodAndBody(spy.mock.calls);

      expect(url).toEqual("http://testhost/api/polling_stations/1/data_entries/1");
      expect(method).toEqual("POST");
      expect(body).toEqual(expectedRequest);
    });
  });

  describe("VotersAndVotesForm errors", () => {
    test("F.201 IncorrectTotal Voters counts", async () => {
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

      const user = userEvent.setup();

      renderForm({ recounted: false });

      const pollCardCount = screen.getByTestId("poll_card_count");
      const proxyCertificateCount = screen.getByTestId("proxy_certificate_count");
      const voterCardCount = screen.getByTestId("voter_card_count");
      const totalAdmittedVotersCount = screen.getByTestId("total_admitted_voters_count");

      await user.type(pollCardCount, "1");
      await user.type(proxyCertificateCount, "1");
      await user.type(voterCardCount, "1");
      await user.type(totalAdmittedVotersCount, "4");

      const submitButton = screen.getByRole("button", { name: "Volgende" });
      await user.click(submitButton);

      const feedbackMessage =
        "Controleer toegelaten kiezersF.201De invoer bij A, B, C of D klopt niet.Check of je het papieren proces-verbaal goed hebt overgenomen.Heb je iets niet goed overgenomen? Herstel de fout en ga verder.Heb je alles goed overgenomen, en blijft de fout? Dan mag je niet verder. Overleg met de coördinator.";
      const feedbackError = await screen.findByTestId("feedback-error");
      expect(feedbackError).toHaveTextContent(feedbackMessage);
      expect(screen.queryByTestId("feedback-warning")).toBeNull();
      expect(pollCardCount).toBeInvalid();
      expect(pollCardCount).toHaveAccessibleErrorMessage(feedbackMessage);
      expect(
        within(pollCardCount.previousElementSibling as HTMLElement).getByRole("img"),
      ).toHaveAccessibleName("bevat een fout");
      expect(proxyCertificateCount).toBeInvalid();
      expect(proxyCertificateCount).toHaveAccessibleErrorMessage(feedbackMessage);
      expect(
        within(proxyCertificateCount.previousElementSibling as HTMLElement).getByRole("img"),
      ).toHaveAccessibleName("bevat een fout");
      expect(voterCardCount).toBeInvalid();
      expect(voterCardCount).toHaveAccessibleErrorMessage(feedbackMessage);
      expect(
        within(voterCardCount.previousElementSibling as HTMLElement).getByRole("img"),
      ).toHaveAccessibleName("bevat een fout");
      expect(totalAdmittedVotersCount).toBeInvalid();
      expect(totalAdmittedVotersCount).toHaveAccessibleErrorMessage(feedbackMessage);
      expect(
        within(totalAdmittedVotersCount.previousElementSibling as HTMLElement).getByRole("img"),
      ).toHaveAccessibleName("bevat een fout");
    });

    test("F.202 IncorrectTotal Votes counts", async () => {
      overrideOnce("post", "/api/polling_stations/1/data_entries/1", 200, {
        validation_results: {
          errors: [
            {
              fields: [
                "data.votes_counts.total_votes_cast_count",
                "data.votes_counts.votes_candidates_counts",
                "data.votes_counts.blank_votes_count",
                "data.votes_counts.invalid_votes_count",
              ],
              code: "F202",
            },
          ],
          warnings: [],
        },
      });

      const user = userEvent.setup();

      renderForm({ recounted: false });

      const votesCandidatesCounts = screen.getByTestId("votes_candidates_counts");
      const blankVotesCount = screen.getByTestId("blank_votes_count");
      const invalidVotesCount = screen.getByTestId("invalid_votes_count");
      const totalVotesCastCount = screen.getByTestId("total_votes_cast_count");

      await user.type(votesCandidatesCounts, "1");
      await user.type(blankVotesCount, "1");
      await user.type(invalidVotesCount, "1");
      await user.type(totalVotesCastCount, "4");

      const submitButton = screen.getByRole("button", { name: "Volgende" });
      await user.click(submitButton);

      const feedbackMessage =
        "Controleer uitgebrachte stemmenF.202De invoer bij E, F, G of H klopt niet.Check of je het papieren proces-verbaal goed hebt overgenomen.Heb je iets niet goed overgenomen? Herstel de fout en ga verder.Heb je alles goed overgenomen, en blijft de fout? Dan mag je niet verder. Overleg met de coördinator.";
      const feedbackError = await screen.findByTestId("feedback-error");
      expect(feedbackError).toHaveTextContent(feedbackMessage);
      expect(screen.queryByTestId("feedback-warning")).toBeNull();
      expect(votesCandidatesCounts).toBeInvalid();
      expect(votesCandidatesCounts).toHaveAccessibleErrorMessage(feedbackMessage);
      expect(blankVotesCount).toBeInvalid();
      expect(blankVotesCount).toHaveAccessibleErrorMessage(feedbackMessage);
      expect(invalidVotesCount).toBeInvalid();
      expect(invalidVotesCount).toHaveAccessibleErrorMessage(feedbackMessage);
      expect(totalVotesCastCount).toBeInvalid();
      expect(totalVotesCastCount).toHaveAccessibleErrorMessage(feedbackMessage);
    });

    test("F.203 IncorrectTotal Voters recounts", async () => {
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

      const user = userEvent.setup();

      renderForm({ recounted: true });

      const pollCardRecount = screen.getByTestId("poll_card_recount");
      const proxyCertificateRecount = screen.getByTestId("proxy_certificate_recount");
      const voterCardRecount = screen.getByTestId("voter_card_recount");
      const totalAdmittedVotersRecount = screen.getByTestId("total_admitted_voters_recount");

      await user.type(pollCardRecount, "1");
      await user.type(proxyCertificateRecount, "1");
      await user.type(voterCardRecount, "1");
      await user.type(totalAdmittedVotersRecount, "4");

      const submitButton = screen.getByRole("button", { name: "Volgende" });
      await user.click(submitButton);

      const feedbackMessage =
        "Controleer hertelde toegelaten kiezersF.203De invoer bij A.2, B.2, C.2 of D.2 klopt niet.Check of je het papieren proces-verbaal goed hebt overgenomen.Heb je iets niet goed overgenomen? Herstel de fout en ga verder.Heb je alles goed overgenomen, en blijft de fout? Dan mag je niet verder. Overleg met de coördinator.";
      const feedbackError = await screen.findByTestId("feedback-error");
      expect(feedbackError).toHaveTextContent(feedbackMessage);
      expect(screen.queryByTestId("feedback-warning")).toBeNull();
      expect(pollCardRecount).toBeInvalid();
      expect(pollCardRecount).toHaveAccessibleErrorMessage(feedbackMessage);
      expect(proxyCertificateRecount).toBeInvalid();
      expect(proxyCertificateRecount).toHaveAccessibleErrorMessage(feedbackMessage);
      expect(voterCardRecount).toBeInvalid();
      expect(voterCardRecount).toHaveAccessibleErrorMessage(feedbackMessage);
      expect(totalAdmittedVotersRecount).toBeInvalid();
      expect(totalAdmittedVotersRecount).toHaveAccessibleErrorMessage(feedbackMessage);
    });
  });

  describe("VotersAndVotesForm warnings", () => {
    test("clicking next without accepting warning results in alert shown and then accept warning", async () => {
      overrideOnce("post", "/api/polling_stations/1/data_entries/1", 200, {
        validation_results: {
          errors: [],
          warnings: [
            {
              fields: ["data.votes_counts.blank_votes_count"],
              code: "W201",
            },
          ],
        },
      });

      const user = userEvent.setup();

      renderForm({ recounted: false });

      const votesCandidatesCounts = screen.getByTestId("votes_candidates_counts");
      const blankVotesCount = screen.getByTestId("blank_votes_count");
      const invalidVotesCount = screen.getByTestId("invalid_votes_count");
      const totalVotesCastCount = screen.getByTestId("total_votes_cast_count");

      await user.type(votesCandidatesCounts, "0");
      await user.type(blankVotesCount, "1");
      await user.type(invalidVotesCount, "0");
      await user.type(totalVotesCastCount, "1");

      const submitButton = screen.getByRole("button", { name: "Volgende" });
      await user.click(submitButton);

      const feedbackMessage =
        "Controleer aantal blanco stemmenW.201Het aantal blanco stemmen is erg hoog.Check of je het papieren proces-verbaal goed hebt overgenomen.Heb je iets niet goed overgenomen? Herstel de fout en ga verder.Heb je alles gecontroleerd en komt je invoer overeen met het papier? Ga dan verder.";
      const feedbackWarning = await screen.findByTestId("feedback-warning");
      expect(feedbackWarning).toHaveTextContent(feedbackMessage);
      expect(screen.queryByTestId("feedback-error")).toBeNull();
      expect(votesCandidatesCounts).toBeValid();
      expect(votesCandidatesCounts).not.toHaveAccessibleErrorMessage(feedbackMessage);
      expect(blankVotesCount).toBeInvalid();
      expect(blankVotesCount).toHaveAccessibleErrorMessage(feedbackMessage);
      expect(invalidVotesCount).toBeValid();
      expect(invalidVotesCount).not.toHaveAccessibleErrorMessage(feedbackMessage);
      expect(totalVotesCastCount).toBeValid();
      expect(totalVotesCastCount).not.toHaveAccessibleErrorMessage(feedbackMessage);

      const acceptFeedbackCheckbox = screen.getByRole("checkbox", {
        name: "Ik heb de aantallen gecontroleerd met het papier en correct overgenomen.",
      });
      expect(acceptFeedbackCheckbox).not.toBeChecked();

      await user.click(submitButton);
      const alertText = screen.getByRole("alert");
      expect(alertText).toHaveTextContent(
        /^Je kan alleen verder als je het papieren proces-verbaal hebt gecontroleerd.$/,
      );

      acceptFeedbackCheckbox.click();
      await user.click(submitButton);

      expect(feedbackWarning).toHaveTextContent(feedbackMessage);
      expect(blankVotesCount).toBeValid();
      expect(blankVotesCount).not.toHaveAccessibleErrorMessage(feedbackMessage);
    });

    test("W.201 high number of blank votes", async () => {
      overrideOnce("post", "/api/polling_stations/1/data_entries/1", 200, {
        validation_results: {
          errors: [],
          warnings: [
            {
              fields: ["data.votes_counts.blank_votes_count"],
              code: "W201",
            },
          ],
        },
      });

      const user = userEvent.setup();

      renderForm({ recounted: false });

      // We await the first element to appear, so we know the page is loaded
      await user.type(await screen.findByTestId("votes_candidates_counts"), "0");
      await user.type(screen.getByTestId("blank_votes_count"), "1");
      await user.type(screen.getByTestId("invalid_votes_count"), "0");
      await user.type(screen.getByTestId("total_votes_cast_count"), "1");

      const submitButton = screen.getByRole("button", { name: "Volgende" });
      await user.click(submitButton);

      const feedbackWarning = await screen.findByTestId("feedback-warning");
      expect(feedbackWarning).toHaveTextContent(
        `Controleer aantal blanco stemmenW.201Het aantal blanco stemmen is erg hoog.Check of je het papieren proces-verbaal goed hebt overgenomen.Heb je iets niet goed overgenomen? Herstel de fout en ga verder.Heb je alles gecontroleerd en komt je invoer overeen met het papier? Ga dan verder.`,
      );
      expect(screen.queryByTestId("feedback-error")).toBeNull();
    });

    test("W.202 high number of invalid votes", async () => {
      overrideOnce("post", "/api/polling_stations/1/data_entries/1", 200, {
        validation_results: {
          errors: [],
          warnings: [
            {
              fields: ["data.votes_counts.blank_votes_count"],
              code: "W202",
            },
          ],
        },
      });

      const user = userEvent.setup();

      renderForm({ recounted: false });

      // We await the first element to appear, so we know the page is loaded
      await user.type(await screen.findByTestId("votes_candidates_counts"), "0");
      await user.type(screen.getByTestId("blank_votes_count"), "0");
      await user.type(screen.getByTestId("invalid_votes_count"), "1");
      await user.type(screen.getByTestId("total_votes_cast_count"), "1");

      const submitButton = screen.getByRole("button", { name: "Volgende" });
      await user.click(submitButton);

      const feedbackWarning = await screen.findByTestId("feedback-warning");
      expect(feedbackWarning).toHaveTextContent(
        `Controleer aantal ongeldige stemmenW.202Het aantal ongeldige stemmen is erg hoog.Check of je het papieren proces-verbaal goed hebt overgenomen.Heb je iets niet goed overgenomen? Herstel de fout en ga verder.Heb je alles gecontroleerd en komt je invoer overeen met het papier? Ga dan verder.`,
      );
      expect(screen.queryByTestId("feedback-error")).toBeNull();
    });

    test("W.203 voters counts and votes counts difference above threshold", async () => {
      overrideOnce("post", "/api/polling_stations/1/data_entries/1", 200, {
        validation_results: {
          errors: [],
          warnings: [
            {
              fields: [
                "data.votes_counts.total_votes_cast_count",
                "data.voters_counts.total_admitted_voters_count",
              ],
              code: "W203",
            },
          ],
        },
      });

      const user = userEvent.setup();

      renderForm();

      // We await the first element to appear, so we know the page is loaded
      await user.type(await screen.findByTestId("poll_card_count"), "20");
      await user.type(screen.getByTestId("proxy_certificate_count"), "0");
      await user.type(screen.getByTestId("voter_card_count"), "0");
      await user.type(screen.getByTestId("total_admitted_voters_count"), "20");

      await user.type(screen.getByTestId("votes_candidates_counts"), "5");
      await user.type(screen.getByTestId("blank_votes_count"), "0");
      await user.type(screen.getByTestId("invalid_votes_count"), "0");
      await user.type(screen.getByTestId("total_votes_cast_count"), "5");

      const submitButton = screen.getByRole("button", { name: "Volgende" });
      await user.click(submitButton);

      const feedbackWarning = await screen.findByTestId("feedback-warning");
      expect(feedbackWarning).toHaveTextContent(
        `Controleer aantal toegelaten kiezers en aantal uitgebrachte stemmenW.203Er is een onverwacht verschil tussen het aantal toegelaten kiezers (A t/m D) en het aantal uitgebrachte stemmen (E t/m H).Check of je het papieren proces-verbaal goed hebt overgenomen.Heb je iets niet goed overgenomen? Herstel de fout en ga verder.Heb je alles gecontroleerd en komt je invoer overeen met het papier? Ga dan verder.`,
      );
      expect(screen.queryByTestId("feedback-error")).toBeNull();
    });

    test("W.204 votes counts and voters recounts difference above threshold", async () => {
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

      const user = userEvent.setup();

      renderForm({ recounted: true });

      // We await the first element to appear, so we know the page is loaded
      await user.type(await screen.findByTestId("poll_card_count"), "5");
      await user.type(screen.getByTestId("proxy_certificate_count"), "0");
      await user.type(screen.getByTestId("voter_card_count"), "0");
      await user.type(screen.getByTestId("total_admitted_voters_count"), "5");

      await user.type(screen.getByTestId("votes_candidates_counts"), "20");
      await user.type(screen.getByTestId("blank_votes_count"), "0");
      await user.type(screen.getByTestId("invalid_votes_count"), "0");
      await user.type(screen.getByTestId("total_votes_cast_count"), "20");

      await user.type(screen.getByTestId("poll_card_recount"), "5");
      await user.type(screen.getByTestId("proxy_certificate_recount"), "0");
      await user.type(screen.getByTestId("voter_card_recount"), "0");
      await user.type(screen.getByTestId("total_admitted_voters_recount"), "5");

      const submitButton = screen.getByRole("button", { name: "Volgende" });
      await user.click(submitButton);

      const feedbackWarning = await screen.findByTestId("feedback-warning");
      expect(feedbackWarning).toHaveTextContent(
        `Controleer aantal uitgebrachte stemmen en herteld aantal toegelaten kiezersW.204Er is een onverwacht verschil tussen het aantal uitgebrachte stemmen (E t/m H) en het herteld aantal toegelaten kiezers (A.2 t/m D.2).Check of je het papieren proces-verbaal goed hebt overgenomen.Heb je iets niet goed overgenomen? Herstel de fout en ga verder.Heb je alles gecontroleerd en komt je invoer overeen met het papier? Ga dan verder.`,
      );
      expect(screen.queryByTestId("feedback-error")).toBeNull();
    });

    test("W.205 total votes cast should not be zero", async () => {
      overrideOnce("post", "/api/polling_stations/1/data_entries/1", 200, {
        validation_results: {
          errors: [],
          warnings: [
            {
              fields: ["data.votes_counts.total_votes_cast_count"],
              code: "W205",
            },
          ],
        },
      });

      const user = userEvent.setup();

      renderForm();

      // We await the first element to appear, so we know the page is loaded
      await user.type(screen.getByTestId("total_votes_cast_count"), "0");

      const submitButton = screen.getByRole("button", { name: "Volgende" });
      await user.click(submitButton);

      const feedbackWarning = await screen.findByTestId("feedback-warning");
      expect(feedbackWarning).toHaveTextContent(
        `Controleer aantal uitgebrachte stemmenW.205Het totaal aantal uitgebrachte stemmen (H) is nul.Check of je het papieren proces-verbaal goed hebt overgenomen.Heb je iets niet goed overgenomen? Herstel de fout en ga verder.Heb je alles gecontroleerd en komt je invoer overeen met het papier? Ga dan verder.`,
      );
      expect(screen.queryByTestId("feedback-error")).toBeNull();
    });

    test("W.206 total admitted voters and total votes cast should not exceed polling stations number of eligible voters", async () => {
      overrideOnce("post", "/api/polling_stations/1/data_entries/1", 200, {
        validation_results: {
          errors: [],
          warnings: [
            {
              fields: [
                "data.votes_counts.total_votes_cast_count",
                "data.voters_counts.total_admitted_voters_count",
              ],
              code: "W206",
            },
          ],
        },
      });

      const user = userEvent.setup();

      renderForm();

      // We await the first element to appear, so we know the page is loaded
      await user.type(await screen.findByTestId("poll_card_count"), "50");
      await user.type(screen.getByTestId("proxy_certificate_count"), "1");
      await user.type(screen.getByTestId("voter_card_count"), "0");
      await user.type(screen.getByTestId("total_admitted_voters_count"), "51");

      await user.type(screen.getByTestId("votes_candidates_counts"), "49");
      await user.type(screen.getByTestId("blank_votes_count"), "1");
      await user.type(screen.getByTestId("invalid_votes_count"), "1");
      await user.type(screen.getByTestId("total_votes_cast_count"), "51");

      const submitButton = screen.getByRole("button", { name: "Volgende" });
      await user.click(submitButton);

      const feedbackWarning = await screen.findByTestId("feedback-warning");
      expect(feedbackWarning).toHaveTextContent(
        `Controleer aantal toegelaten kiezers en aantal uitgebrachte stemmenW.206Het totaal aantal toegelaten kiezers (D) en/of het totaal aantal uitgebrachte stemmen (H) is hoger dan het aantal kiesgerechtigden voor dit stembureau.Check of je het papieren proces-verbaal goed hebt overgenomen.Heb je iets niet goed overgenomen? Herstel de fout en ga verder.Heb je alles gecontroleerd en komt je invoer overeen met het papier? Ga dan verder.`,
      );
      expect(screen.queryByTestId("feedback-error")).toBeNull();
    });

    test("W.207 total votes cast and total admitted voters recount should not exceed polling stations number of eligible voters", async () => {
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

      const user = userEvent.setup();

      renderForm({ recounted: true });

      // We await the first element to appear, so we know the page is loaded
      await user.type(await screen.findByTestId("poll_card_count"), "50");
      await user.type(screen.getByTestId("proxy_certificate_count"), "1");
      await user.type(screen.getByTestId("voter_card_count"), "0");
      await user.type(screen.getByTestId("total_admitted_voters_count"), "51");

      await user.type(screen.getByTestId("votes_candidates_counts"), "49");
      await user.type(screen.getByTestId("blank_votes_count"), "1");
      await user.type(screen.getByTestId("invalid_votes_count"), "1");
      await user.type(screen.getByTestId("total_votes_cast_count"), "51");

      await user.type(screen.getByTestId("poll_card_recount"), "50");
      await user.type(screen.getByTestId("proxy_certificate_recount"), "0");
      await user.type(screen.getByTestId("voter_card_recount"), "1");
      await user.type(screen.getByTestId("total_admitted_voters_recount"), "51");

      const submitButton = screen.getByRole("button", { name: "Volgende" });
      await user.click(submitButton);

      const feedbackWarning = await screen.findByTestId("feedback-warning");
      expect(feedbackWarning).toHaveTextContent(
        `Controleer aantal uitgebrachte stemmen en herteld aantal toegelaten kiezersW.207Het totaal aantal uitgebrachte stemmen (H) en/of het herteld totaal aantal toegelaten kiezers (D.2) is hoger dan het aantal kiesgerechtigden voor dit stembureau.Check of je het papieren proces-verbaal goed hebt overgenomen.Heb je iets niet goed overgenomen? Herstel de fout en ga verder.Heb je alles gecontroleerd en komt je invoer overeen met het papier? Ga dan verder.`,
      );
      expect(screen.queryByTestId("feedback-error")).toBeNull();
    });

    test("W.208 EqualInput voters counts and votes counts", async () => {
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

      const user = userEvent.setup();

      renderForm({ recounted: false });

      // We await the first element to appear, so we know the page is loaded
      await user.type(await screen.findByTestId("poll_card_count"), "1");
      await user.type(screen.getByTestId("proxy_certificate_count"), "0");
      await user.type(screen.getByTestId("voter_card_count"), "0");
      await user.type(screen.getByTestId("total_admitted_voters_count"), "1");

      await user.type(screen.getByTestId("votes_candidates_counts"), "1");
      await user.type(screen.getByTestId("blank_votes_count"), "0");
      await user.type(screen.getByTestId("invalid_votes_count"), "0");
      await user.type(screen.getByTestId("total_votes_cast_count"), "1");

      const submitButton = screen.getByRole("button", { name: "Volgende" });
      await user.click(submitButton);

      const feedbackWarning = await screen.findByTestId("feedback-warning");
      expect(feedbackWarning).toHaveTextContent(
        `Controleer A t/m D en E t/m HW.208De getallen bij A t/m D zijn precies hetzelfde als E t/m H.Check of je het papieren proces-verbaal goed hebt overgenomen.Heb je iets niet goed overgenomen? Herstel de fout en ga verder.Heb je alles gecontroleerd en komt je invoer overeen met het papier? Ga dan verder.`,
      );
      expect(screen.queryByTestId("feedback-error")).toBeNull();
    });

    test("W.209 EqualInput voters recounts and votes counts", async () => {
      overrideOnce("post", "/api/polling_stations/1/data_entries/1", 200, {
        validation_results: {
          errors: [],
          warnings: [
            {
              fields: [
                "data.votes_counts.votes_candidates_counts",
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

      const user = userEvent.setup();

      renderForm({ recounted: true });

      await user.type(screen.getByTestId("votes_candidates_counts"), "1");
      await user.type(screen.getByTestId("blank_votes_count"), "0");
      await user.type(screen.getByTestId("invalid_votes_count"), "0");
      await user.type(screen.getByTestId("total_votes_cast_count"), "1");

      await user.type(screen.getByTestId("poll_card_recount"), "1");
      await user.type(screen.getByTestId("proxy_certificate_recount"), "0");
      await user.type(screen.getByTestId("voter_card_recount"), "0");
      await user.type(screen.getByTestId("total_admitted_voters_recount"), "1");

      const submitButton = screen.getByRole("button", { name: "Volgende" });
      await user.click(submitButton);

      const feedbackWarning = await screen.findByTestId("feedback-warning");
      expect(feedbackWarning).toHaveTextContent(
        `Controleer E t/m H en A.2 t/m D.2W.209De getallen bij E t/m H zijn precies hetzelfde als A.2 t/m D.2.Check of je het papieren proces-verbaal goed hebt overgenomen.Heb je iets niet goed overgenomen? Herstel de fout en ga verder.Heb je alles gecontroleerd en komt je invoer overeen met het papier? Ga dan verder.`,
      );
      expect(screen.queryByTestId("feedback-error")).toBeNull();
    });
  });
});
