import { userEvent } from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";

import { getUrlMethodAndBody, overrideOnce, render, screen, userTypeInputs } from "app/test/unit";
import { emptyDataEntryRequest } from "app/test/unit/form.ts";

import { PollingStationFormController, PollingStationValues } from "@kiesraad/api";
import { electionMockData, pollingStationMockData } from "@kiesraad/api-mocks";

import { DifferencesForm } from "./DifferencesForm";

function renderForm(defaultValues: Partial<PollingStationValues> = {}) {
  return render(
    <PollingStationFormController
      election={electionMockData}
      pollingStationId={pollingStationMockData.id}
      entryNumber={1}
      defaultValues={defaultValues}
    >
      <DifferencesForm />
    </PollingStationFormController>,
  );
}

describe("Test DifferencesForm", () => {
  describe("DifferencesForm user interactions", () => {
    test("hitting enter key does not result in api call", async () => {
      const user = userEvent.setup();

      renderForm({ recounted: false });
      const spy = vi.spyOn(global, "fetch");

      const moreBallotsCount = await screen.findByTestId("more_ballots_count");
      await user.type(moreBallotsCount, "12345");
      expect(moreBallotsCount).toHaveValue("12.345");

      await user.keyboard("{enter}");

      expect(spy).not.toHaveBeenCalled();
    });

    test("hitting shift+enter does result in api call", async () => {
      const user = userEvent.setup();

      renderForm({ recounted: false });
      const spy = vi.spyOn(global, "fetch");

      const moreBallotsCount = await screen.findByTestId("more_ballots_count");
      await user.type(moreBallotsCount, "12345");
      expect(moreBallotsCount).toHaveValue("12.345");

      await user.keyboard("{shift>}{enter}{/shift}");

      expect(spy).toHaveBeenCalled();
    });

    test("Form field entry and keybindings", async () => {
      overrideOnce("post", "/api/polling_stations/1/data_entries/1", 200, {
        validation_results: { errors: [], warnings: [] },
      });

      const user = userEvent.setup();

      renderForm({ recounted: false });

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
          ...emptyDataEntryRequest.data,
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
      expect(feedbackError).toHaveTextContent(
        `Controleer I (stembiljetten meer geteld)F.301Je hebt bij Aantal kiezers en stemmers ingevuld dat er meer stemmen dan kiezers waren. Het aantal dat je bij I hebt ingevuld is niet gelijk aan het aantal meer getelde stembiljetten.Check of je het papieren proces-verbaal goed hebt overgenomen.Heb je iets niet goed overgenomen? Herstel de fout en ga verder.Heb je alles goed overgenomen, en blijft de fout? Dan mag je niet verder. Overleg met de coördinator.`,
      );
      expect(screen.queryByTestId("feedback-warning")).toBeNull();
      expect(screen.queryByTestId("server-feedback-error")).toBeNull();
    });

    test("F.302 Should be empty", async () => {
      overrideOnce("post", "/api/polling_stations/1/data_entries/1", 200, {
        validation_results: {
          errors: [
            {
              fields: ["data.differences_counts.fewer_ballots_count"],
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
      expect(feedbackError).toHaveTextContent(
        `Controleer J (stembiljetten minder geteld)F.302Je hebt bij Aantal kiezers en stemmers ingevuld dat er meer stemmen dan kiezers waren. Daarom mag J niet ingevuld zijn.Check of je het papieren proces-verbaal goed hebt overgenomen.Heb je iets niet goed overgenomen? Herstel de fout en ga verder.Heb je alles goed overgenomen, en blijft de fout? Dan mag je niet verder. Overleg met de coördinator.`,
      );
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
      expect(feedbackError).toHaveTextContent(
        `Controleer J (stembiljetten minder geteld)F.303Je hebt bij Aantal kiezers en stemmers ingevuld dat er minder stemmen dan kiezers waren. Het aantal dat je bij J hebt ingevuld is niet gelijk aan het aantal minder getelde stembiljetten.Check of je het papieren proces-verbaal goed hebt overgenomen.Heb je iets niet goed overgenomen? Herstel de fout en ga verder.Heb je alles goed overgenomen, en blijft de fout? Dan mag je niet verder. Overleg met de coördinator.`,
      );
      expect(screen.queryByTestId("feedback-warning")).toBeNull();
      expect(screen.queryByTestId("server-feedback-error")).toBeNull();
    });

    test("F.304 Should be empty", async () => {
      overrideOnce("post", "/api/polling_stations/1/data_entries/1", 200, {
        validation_results: {
          errors: [
            {
              fields: ["data.differences_counts.more_ballots_count"],
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
      expect(feedbackError).toHaveTextContent(
        `Controleer I (stembiljetten meer geteld)F.304Je hebt bij Aantal kiezers en stemmers ingevuld dat er minder stemmen dan kiezers waren. Daarom mag I niet ingevuld zijn.Check of je het papieren proces-verbaal goed hebt overgenomen.Heb je iets niet goed overgenomen? Herstel de fout en ga verder.Heb je alles goed overgenomen, en blijft de fout? Dan mag je niet verder. Overleg met de coördinator.`,
      );
      expect(screen.queryByTestId("feedback-warning")).toBeNull();
      expect(screen.queryByTestId("server-feedback-error")).toBeNull();
    });

    test("F.305 No difference expected", async () => {
      overrideOnce("post", "/api/polling_stations/1/data_entries/1", 200, {
        validation_results: {
          errors: [
            {
              fields: [
                "data.differences_counts.fewer_ballots_count",
                "data.differences_counts.unreturned_ballots_count",
                "data.differences_counts.too_few_ballots_handed_out_count",
                "data.differences_counts.too_few_ballots_handed_out_count",
                "data.differences_counts.other_explanation_count",
                "data.differences_counts.no_explanation_count",
              ],
              code: "F305",
            },
          ],
          warnings: [],
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

      const feedbackWarning = await screen.findByTestId("feedback-error");
      expect(feedbackWarning).toHaveTextContent(
        `Controleer ingevulde verschillenF.305Je hebt bij Aantal kiezers en stemmers ingevuld dat er evenveel stemmen als kiezers waren. Maar je hebt wel verschillen ingevuld.Check of je het papieren proces-verbaal goed hebt overgenomen.Heb je iets niet goed overgenomen? Herstel de fout en ga verder.Heb je alles goed overgenomen, en blijft de fout? Dan mag je niet verder. Overleg met de coördinator.`,
      );
      expect(screen.queryByTestId("feedback-warning")).toBeNull();
    });
  });

  describe("DifferencesForm warnings", () => {
    test("clicking next without accepting warning results in alert shown", async () => {
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
              code: "W301",
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
      expect(feedbackWarning).toHaveTextContent(
        `Controleer ingevulde verschillenW.301De invoer bij I, K, L, M, N of O klopt niet.Check of je het papieren proces-verbaal goed hebt overgenomen.Heb je iets niet goed overgenomen? Herstel de fout en ga verder.Heb je alles gecontroleerd en komt je invoer overeen met het papier? Ga dan verder.`,
      );

      const acceptFeedbackCheckbox = screen.getByRole("checkbox", {
        name: "Ik heb de aantallen gecontroleerd met het papier en correct overgenomen.",
      });
      expect(acceptFeedbackCheckbox).not.toBeChecked();

      await user.click(submitButton);
      const alertText = screen.getByRole("alert");
      expect(alertText).toHaveTextContent(
        /^Je kan alleen verder als je het het papieren proces-verbaal hebt gecontroleerd.$/,
      );
    });

    test("W.301 Incorrect total", async () => {
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
              code: "W301",
            },
          ],
        },
      });

      const user = userEvent.setup();

      renderForm({ recounted: false });

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
      expect(feedbackWarning).toHaveTextContent(
        `Controleer ingevulde verschillenW.301De invoer bij I, K, L, M, N of O klopt niet.Check of je het papieren proces-verbaal goed hebt overgenomen.Heb je iets niet goed overgenomen? Herstel de fout en ga verder.Heb je alles gecontroleerd en komt je invoer overeen met het papier? Ga dan verder.`,
      );
      expect(screen.queryByTestId("feedback-error")).toBeNull();
      expect(screen.queryByTestId("server-feedback-error")).toBeNull();
    });

    test("W.302 Incorrect total", async () => {
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
              code: "W302",
            },
          ],
        },
      });

      const user = userEvent.setup();

      renderForm({ recounted: false });

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
      expect(feedbackWarning).toHaveTextContent(
        `Controleer ingevulde verschillenW.302De invoer bij J, K, L, M, N of O klopt niet.Check of je het papieren proces-verbaal goed hebt overgenomen.Heb je iets niet goed overgenomen? Herstel de fout en ga verder.Heb je alles gecontroleerd en komt je invoer overeen met het papier? Ga dan verder.`,
      );
      expect(screen.queryByTestId("feedback-error")).toBeNull();
      expect(screen.queryByTestId("server-feedback-error")).toBeNull();
    });
  });
});
