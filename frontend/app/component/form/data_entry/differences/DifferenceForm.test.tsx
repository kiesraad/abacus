import { userEvent } from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

import {
  defaultFormSection,
  emptyDataEntryRequest,
  expectFieldsToBeInvalidAndToHaveAccessibleErrorMessage,
  expectFieldsToBeValidAndToNotHaveAccessibleErrorMessage,
  expectFieldsToHaveIconAndToHaveAccessibleName,
  expectFieldsToNotHaveIcon,
  overrideServerGetDataEntryResponse,
} from "app/component/form/data_entry/test.util";

import { POLLING_STATION_DATA_ENTRY_SAVE_REQUEST_BODY } from "@kiesraad/api";
import {
  electionMockData,
  PollingStationDataEntryGetHandler,
  PollingStationDataEntrySaveHandler,
} from "@kiesraad/api-mocks";
import { getUrlMethodAndBody, overrideOnce, render, screen, server, userTypeInputs } from "@kiesraad/test";

import { DataEntryProvider } from "../state/DataEntryProvider";
import { DataEntryState } from "../state/types";
import { DifferencesForm } from "./DifferencesForm";

const defaultDataEntryState: DataEntryState = {
  election: electionMockData,
  pollingStationId: 1,
  error: null,
  pollingStationResults: null,
  entryNumber: 1,
  formState: {
    current: "differences_counts",
    furthest: "differences_counts",
    sections: {
      recounted: {
        id: "recounted",
        index: 1,
        ...defaultFormSection,
      },
      voters_votes_counts: {
        id: "voters_votes_counts",
        index: 2,
        ...defaultFormSection,
      },
      differences_counts: {
        id: "differences_counts",
        index: 3,
        ...defaultFormSection,
      },
      save: {
        id: "save",
        index: 4,
        ...defaultFormSection,
      },
    },
  },
  targetFormSectionId: "recounted",
  status: "idle",
  cache: null,
};

function renderForm() {
  return render(
    <DataEntryProvider election={electionMockData} pollingStationId={1} entryNumber={1}>
      <DifferencesForm />
    </DataEntryProvider>,
  );
}

const differencesFieldIds = {
  moreBallotsCount: "more_ballots_count",
  fewerBallotsCount: "fewer_ballots_count",
  unreturnedBallotsCount: "unreturned_ballots_count",
  tooFewBallotsHandedOutCount: "too_few_ballots_handed_out_count",
  tooManyBallotsHandedOutCount: "too_many_ballots_handed_out_count",
  otherExplanationCount: "other_explanation_count",
  noExplanationCount: "no_explanation_count",
};

describe("Test DifferencesForm", () => {
  beforeEach(() => {
    server.use(PollingStationDataEntryGetHandler, PollingStationDataEntrySaveHandler);
  });

  describe("DifferencesForm user interactions", () => {
    test("hitting enter key does not result in api call", async () => {
      const user = userEvent.setup();

      overrideServerGetDataEntryResponse({
        formState: defaultDataEntryState.formState,
        pollingStationResults: {
          recounted: false,
        },
      });
      renderForm();

      const moreBallotsCount = await screen.findByRole("textbox", { name: "I Stembiljetten méér geteld" });
      await user.type(moreBallotsCount, "12345");
      expect(moreBallotsCount).toHaveValue("12345");

      const spy = vi.spyOn(global, "fetch");

      await user.keyboard("{enter}");

      expect(spy).not.toHaveBeenCalled();
    });

    test("hitting shift+enter does result in api call", async () => {
      const user = userEvent.setup();
      overrideServerGetDataEntryResponse({
        formState: defaultDataEntryState.formState,
        pollingStationResults: {
          recounted: false,
        },
      });

      renderForm();
      const spy = vi.spyOn(global, "fetch");

      const moreBallotsCount = await screen.findByRole("textbox", { name: "I Stembiljetten méér geteld" });
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
      overrideServerGetDataEntryResponse({
        formState: defaultDataEntryState.formState,
        pollingStationResults: {
          recounted: false,
        },
      });
      renderForm();

      const moreBallotsCount = await screen.findByRole("textbox", { name: "I Stembiljetten méér geteld" });
      expect(moreBallotsCount.closest("fieldset")).toHaveAccessibleName(
        "Verschillen tussen toegelaten kiezers en uitgebrachte stemmen",
      );
      expect(moreBallotsCount).toHaveAccessibleName("I Stembiljetten méér geteld");
      expect(moreBallotsCount).toHaveFocus();
      await user.type(moreBallotsCount, "12345");
      expect(moreBallotsCount).toHaveValue("12345");

      await user.keyboard("{enter}");

      const fewerBallotsCount = screen.getByRole("textbox", { name: "J Stembiljetten minder geteld" });
      expect(fewerBallotsCount).toHaveFocus();
      await user.paste("6789");
      expect(fewerBallotsCount).toHaveValue("6789");

      await user.keyboard("{enter}");

      const unreturnedBallotsCount = screen.getByRole("textbox", { name: "K Niet ingeleverde stembiljetten" });
      expect(unreturnedBallotsCount).toHaveFocus();
      await user.type(unreturnedBallotsCount, "123");
      expect(unreturnedBallotsCount).toHaveValue("123");

      await user.keyboard("{enter}");

      const tooFewBallotsHandedOutCount = screen.getByRole("textbox", {
        name: "L Te weinig uitgereikte stembiljetten",
      });
      expect(tooFewBallotsHandedOutCount).toHaveFocus();
      await user.paste("4242");
      expect(tooFewBallotsHandedOutCount).toHaveValue("4242");

      await user.keyboard("{enter}");

      const tooManyBallotsHandedOutCount = screen.getByRole("textbox", { name: "M Te veel uitgereikte stembiljetten" });
      expect(tooManyBallotsHandedOutCount).toHaveFocus();
      await user.type(tooManyBallotsHandedOutCount, "12");
      expect(tooManyBallotsHandedOutCount).toHaveValue("12");

      await user.keyboard("{enter}");

      const otherExplanationCount = screen.getByRole("textbox", { name: "N Andere verklaring voor het verschil" });
      expect(otherExplanationCount).toHaveFocus();
      // Test if maxLength on field works
      await user.type(otherExplanationCount, "1234567890");
      expect(otherExplanationCount).toHaveValue("123456789");

      await user.keyboard("{enter}");

      const noExplanationCount = screen.getByRole("textbox", { name: "O Geen verklaring voor het verschil" });
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
          votes_candidates_count: 52,
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
        client_state: {},
      };

      const user = userEvent.setup();
      overrideServerGetDataEntryResponse({
        formState: defaultDataEntryState.formState,
        pollingStationResults: {
          ...votersAndVotesValues,
        },
      });

      renderForm();

      await screen.findByTestId("differences_form");
      const spy = vi.spyOn(global, "fetch");

      await userTypeInputs(user, {
        ...expectedRequest.data.differences_counts,
      });

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
    test("F.301 IncorrectDifference", async () => {
      const user = userEvent.setup();

      overrideServerGetDataEntryResponse({
        formState: defaultDataEntryState.formState,
        pollingStationResults: {
          recounted: false,
        },
      });
      renderForm();

      await screen.findByTestId("differences_form");
      overrideOnce("post", "/api/polling_stations/1/data_entries/1", 200, {
        validation_results: {
          errors: [{ fields: ["data.differences_counts.more_ballots_count"], code: "F301" }],
          warnings: [],
        },
      });

      const submitButton = await screen.findByRole("button", { name: "Volgende" });
      await user.click(submitButton);

      const feedbackMessage =
        "Controleer I (stembiljetten meer geteld)F.301Je hebt bij Aantal kiezers en stemmers ingevuld dat er meer stemmen dan kiezers waren. Het aantal dat je bij I hebt ingevuld is niet gelijk aan het aantal meer getelde stembiljetten.Check of je het papieren proces-verbaal goed hebt overgenomen.Heb je iets niet goed overgenomen? Herstel de fout en ga verder.Heb je alles goed overgenomen, en blijft de fout? Dan mag je niet verder. Overleg met de coördinator.";
      expect(await screen.findByTestId("feedback-error")).toHaveTextContent(feedbackMessage);
      expect(screen.queryByTestId("feedback-warning")).toBeNull();
      const expectedInvalidFieldIds = [differencesFieldIds.moreBallotsCount];
      const expectedValidFieldIds = [
        differencesFieldIds.fewerBallotsCount,
        differencesFieldIds.unreturnedBallotsCount,
        differencesFieldIds.tooFewBallotsHandedOutCount,
        differencesFieldIds.tooManyBallotsHandedOutCount,
        differencesFieldIds.otherExplanationCount,
        differencesFieldIds.noExplanationCount,
      ];
      expectFieldsToBeInvalidAndToHaveAccessibleErrorMessage(expectedInvalidFieldIds, feedbackMessage);
      expectFieldsToHaveIconAndToHaveAccessibleName(expectedInvalidFieldIds, "bevat een fout");
      expectFieldsToBeValidAndToNotHaveAccessibleErrorMessage(expectedValidFieldIds);
      expectFieldsToNotHaveIcon(expectedValidFieldIds);
    });

    test("F.302 Should be empty", async () => {
      const user = userEvent.setup();
      overrideServerGetDataEntryResponse({
        formState: defaultDataEntryState.formState,
        pollingStationResults: {
          recounted: true,
        },
      });
      renderForm();

      await screen.findByTestId("differences_form");
      overrideOnce("post", "/api/polling_stations/1/data_entries/1", 200, {
        validation_results: {
          errors: [{ fields: ["data.differences_counts.fewer_ballots_count"], code: "F302" }],
          warnings: [],
        },
      });

      const submitButton = await screen.findByRole("button", { name: "Volgende" });
      await user.click(submitButton);

      const feedbackMessage =
        "Controleer J (stembiljetten minder geteld)F.302Je hebt bij Aantal kiezers en stemmers ingevuld dat er meer stemmen dan kiezers waren. Daarom mag J niet ingevuld zijn.Check of je het papieren proces-verbaal goed hebt overgenomen.Heb je iets niet goed overgenomen? Herstel de fout en ga verder.Heb je alles goed overgenomen, en blijft de fout? Dan mag je niet verder. Overleg met de coördinator.";
      expect(await screen.findByTestId("feedback-error")).toHaveTextContent(feedbackMessage);
      expect(screen.queryByTestId("feedback-warning")).toBeNull();
      const expectedInvalidFieldIds = [differencesFieldIds.fewerBallotsCount];
      const expectedValidFieldIds = [
        differencesFieldIds.moreBallotsCount,
        differencesFieldIds.unreturnedBallotsCount,
        differencesFieldIds.tooFewBallotsHandedOutCount,
        differencesFieldIds.tooManyBallotsHandedOutCount,
        differencesFieldIds.otherExplanationCount,
        differencesFieldIds.noExplanationCount,
      ];
      expectFieldsToBeInvalidAndToHaveAccessibleErrorMessage(expectedInvalidFieldIds, feedbackMessage);
      expectFieldsToHaveIconAndToHaveAccessibleName(expectedInvalidFieldIds, "bevat een fout");
      expectFieldsToBeValidAndToNotHaveAccessibleErrorMessage(expectedValidFieldIds);
      expectFieldsToNotHaveIcon(expectedValidFieldIds);
    });

    test("F.303 IncorrectDifference", async () => {
      const user = userEvent.setup();

      overrideServerGetDataEntryResponse({
        formState: defaultDataEntryState.formState,
        pollingStationResults: {
          recounted: false,
        },
      });

      renderForm();

      await screen.findByTestId("differences_form");
      overrideOnce("post", "/api/polling_stations/1/data_entries/1", 200, {
        validation_results: {
          errors: [{ fields: ["data.differences_counts.fewer_ballots_count"], code: "F303" }],
          warnings: [],
        },
      });

      const submitButton = await screen.findByRole("button", { name: "Volgende" });
      await user.click(submitButton);

      const feedbackMessage =
        "Controleer J (stembiljetten minder geteld)F.303Je hebt bij Aantal kiezers en stemmers ingevuld dat er minder stemmen dan kiezers waren. Het aantal dat je bij J hebt ingevuld is niet gelijk aan het aantal minder getelde stembiljetten.Check of je het papieren proces-verbaal goed hebt overgenomen.Heb je iets niet goed overgenomen? Herstel de fout en ga verder.Heb je alles goed overgenomen, en blijft de fout? Dan mag je niet verder. Overleg met de coördinator.";
      expect(await screen.findByTestId("feedback-error")).toHaveTextContent(feedbackMessage);
      expect(screen.queryByTestId("feedback-warning")).toBeNull();
      const expectedInvalidFieldIds = [differencesFieldIds.fewerBallotsCount];
      const expectedValidFieldIds = [
        differencesFieldIds.moreBallotsCount,
        differencesFieldIds.unreturnedBallotsCount,
        differencesFieldIds.tooFewBallotsHandedOutCount,
        differencesFieldIds.tooManyBallotsHandedOutCount,
        differencesFieldIds.otherExplanationCount,
        differencesFieldIds.noExplanationCount,
      ];
      expectFieldsToBeInvalidAndToHaveAccessibleErrorMessage(expectedInvalidFieldIds, feedbackMessage);
      expectFieldsToHaveIconAndToHaveAccessibleName(expectedInvalidFieldIds, "bevat een fout");
      expectFieldsToBeValidAndToNotHaveAccessibleErrorMessage(expectedValidFieldIds);
      expectFieldsToNotHaveIcon(expectedValidFieldIds);
    });

    test("F.304 Should be empty", async () => {
      const user = userEvent.setup();

      overrideServerGetDataEntryResponse({
        formState: defaultDataEntryState.formState,
        pollingStationResults: {
          recounted: true,
        },
      });

      renderForm();

      await screen.findByTestId("differences_form");
      overrideOnce("post", "/api/polling_stations/1/data_entries/1", 200, {
        validation_results: {
          errors: [{ fields: ["data.differences_counts.more_ballots_count"], code: "F304" }],
          warnings: [],
        },
      });

      const submitButton = await screen.findByRole("button", { name: "Volgende" });
      await user.click(submitButton);

      const feedbackMessage =
        "Controleer I (stembiljetten meer geteld)F.304Je hebt bij Aantal kiezers en stemmers ingevuld dat er minder stemmen dan kiezers waren. Daarom mag I niet ingevuld zijn.Check of je het papieren proces-verbaal goed hebt overgenomen.Heb je iets niet goed overgenomen? Herstel de fout en ga verder.Heb je alles goed overgenomen, en blijft de fout? Dan mag je niet verder. Overleg met de coördinator.";
      expect(await screen.findByTestId("feedback-error")).toHaveTextContent(feedbackMessage);
      expect(screen.queryByTestId("feedback-warning")).toBeNull();
      const expectedInvalidFieldIds = [differencesFieldIds.moreBallotsCount];
      const expectedValidFieldIds = [
        differencesFieldIds.fewerBallotsCount,
        differencesFieldIds.unreturnedBallotsCount,
        differencesFieldIds.tooFewBallotsHandedOutCount,
        differencesFieldIds.tooManyBallotsHandedOutCount,
        differencesFieldIds.otherExplanationCount,
        differencesFieldIds.noExplanationCount,
      ];
      expectFieldsToBeInvalidAndToHaveAccessibleErrorMessage(expectedInvalidFieldIds, feedbackMessage);
      expectFieldsToHaveIconAndToHaveAccessibleName(expectedInvalidFieldIds, "bevat een fout");
      expectFieldsToBeValidAndToNotHaveAccessibleErrorMessage(expectedValidFieldIds);
      expectFieldsToNotHaveIcon(expectedValidFieldIds);
    });

    test("F.305 No difference expected", async () => {
      const user = userEvent.setup();

      overrideServerGetDataEntryResponse({
        formState: defaultDataEntryState.formState,
        pollingStationResults: {
          recounted: false,
        },
      });

      renderForm();

      await screen.findByTestId("differences_form");
      overrideOnce("post", "/api/polling_stations/1/data_entries/1", 200, {
        validation_results: {
          errors: [
            {
              fields: [
                "data.differences_counts.fewer_ballots_count",
                "data.differences_counts.unreturned_ballots_count",
                "data.differences_counts.too_many_ballots_handed_out_count",
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

      const submitButton = await screen.findByRole("button", { name: "Volgende" });
      await user.click(submitButton);

      const feedbackMessage =
        "Controleer ingevulde verschillenF.305Je hebt bij Aantal kiezers en stemmers ingevuld dat er evenveel stemmen als kiezers waren. Maar je hebt wel verschillen ingevuld.Check of je het papieren proces-verbaal goed hebt overgenomen.Heb je iets niet goed overgenomen? Herstel de fout en ga verder.Heb je alles goed overgenomen, en blijft de fout? Dan mag je niet verder. Overleg met de coördinator.";
      expect(await screen.findByTestId("feedback-error")).toHaveTextContent(feedbackMessage);
      expect(screen.queryByTestId("feedback-warning")).toBeNull();
      const expectedInvalidFieldIds = [
        differencesFieldIds.fewerBallotsCount,
        differencesFieldIds.unreturnedBallotsCount,
        differencesFieldIds.tooFewBallotsHandedOutCount,
        differencesFieldIds.tooManyBallotsHandedOutCount,
        differencesFieldIds.otherExplanationCount,
        differencesFieldIds.noExplanationCount,
      ];
      const expectedValidFieldIds = [differencesFieldIds.moreBallotsCount];
      expectFieldsToBeInvalidAndToHaveAccessibleErrorMessage(expectedInvalidFieldIds, feedbackMessage);
      expectFieldsToHaveIconAndToHaveAccessibleName(expectedInvalidFieldIds, "bevat een fout");
      expectFieldsToBeValidAndToNotHaveAccessibleErrorMessage(expectedValidFieldIds);
      expectFieldsToNotHaveIcon(expectedValidFieldIds);
    });
  });

  describe("DifferencesForm warnings", () => {
    test("clicking next without accepting warning results in alert shown and then accept warning", async () => {
      const user = userEvent.setup();

      overrideServerGetDataEntryResponse({
        formState: defaultDataEntryState.formState,
        pollingStationResults: {
          recounted: false,
        },
      });

      renderForm();

      await screen.findByTestId("differences_form");
      overrideOnce("post", "/api/polling_stations/1/data_entries/1", 200, {
        validation_results: {
          errors: [],
          warnings: [
            {
              fields: [
                "data.differences_counts.more_ballots_count",
                "data.differences_counts.too_many_ballots_handed_out_count",
                "data.differences_counts.too_few_ballots_handed_out_count",
                "data.differences_counts.unreturned_ballots_count",
                "data.differences_counts.other_explanation_count",
                "data.differences_counts.no_explanation_count",
              ],
              code: "W301",
            },
          ],
        },
      });

      const submitButton = await screen.findByRole("button", { name: "Volgende" });
      await user.click(submitButton);

      const feedbackMessage =
        "Controleer ingevulde verschillenW.301De invoer bij I, K, L, M, N of O klopt niet.Check of je het papieren proces-verbaal goed hebt overgenomen.Heb je iets niet goed overgenomen? Herstel de fout en ga verder.Heb je alles gecontroleerd en komt je invoer overeen met het papier? Ga dan verder.";
      const feedbackWarning = await screen.findByTestId("feedback-warning");
      expect(feedbackWarning).toHaveTextContent(feedbackMessage);
      expect(screen.queryByTestId("feedback-error")).toBeNull();
      const expectedInvalidFieldIds = [
        differencesFieldIds.moreBallotsCount,
        differencesFieldIds.unreturnedBallotsCount,
        differencesFieldIds.tooFewBallotsHandedOutCount,
        differencesFieldIds.tooManyBallotsHandedOutCount,
        differencesFieldIds.otherExplanationCount,
        differencesFieldIds.noExplanationCount,
      ];
      let expectedValidFieldIds = [differencesFieldIds.fewerBallotsCount];
      expectFieldsToBeInvalidAndToHaveAccessibleErrorMessage(expectedInvalidFieldIds, feedbackMessage);
      expectFieldsToHaveIconAndToHaveAccessibleName(expectedInvalidFieldIds, "bevat een waarschuwing");
      expectFieldsToBeValidAndToNotHaveAccessibleErrorMessage(expectedValidFieldIds);
      expectFieldsToNotHaveIcon(expectedValidFieldIds);

      const acceptFeedbackCheckbox = screen.getByRole("checkbox", {
        name: "Ik heb de aantallen gecontroleerd met het papier en correct overgenomen.",
      });
      expect(acceptFeedbackCheckbox).not.toBeChecked();

      await user.click(submitButton);
      const alertText = screen.getByRole("alert");
      expect(alertText).toHaveTextContent(
        "Je kan alleen verder als je het het papieren proces-verbaal hebt gecontroleerd.",
      );

      acceptFeedbackCheckbox.click();
      await user.click(submitButton);

      expect(feedbackWarning).toHaveTextContent(feedbackMessage);
      // All fields should be considered valid now
      expectedValidFieldIds = expectedValidFieldIds.concat(expectedInvalidFieldIds);
      expectFieldsToBeValidAndToNotHaveAccessibleErrorMessage(expectedValidFieldIds);
      expectFieldsToNotHaveIcon(expectedValidFieldIds);
    });

    test("W.301 Incorrect total", async () => {
      const user = userEvent.setup();

      overrideServerGetDataEntryResponse({
        formState: defaultDataEntryState.formState,
        pollingStationResults: {
          recounted: false,
        },
      });

      renderForm();

      await screen.findByTestId("differences_form");
      overrideOnce("post", "/api/polling_stations/1/data_entries/1", 200, {
        validation_results: {
          errors: [],
          warnings: [
            {
              fields: [
                "data.differences_counts.more_ballots_count",
                "data.differences_counts.too_many_ballots_handed_out_count",
                "data.differences_counts.too_few_ballots_handed_out_count",
                "data.differences_counts.unreturned_ballots_count",
                "data.differences_counts.other_explanation_count",
                "data.differences_counts.no_explanation_count",
              ],
              code: "W301",
            },
          ],
        },
      });

      const submitButton = await screen.findByRole("button", { name: "Volgende" });
      await user.click(submitButton);

      const feedbackMessage =
        "Controleer ingevulde verschillenW.301De invoer bij I, K, L, M, N of O klopt niet.Check of je het papieren proces-verbaal goed hebt overgenomen.Heb je iets niet goed overgenomen? Herstel de fout en ga verder.Heb je alles gecontroleerd en komt je invoer overeen met het papier? Ga dan verder.";
      expect(await screen.findByTestId("feedback-warning")).toHaveTextContent(feedbackMessage);
      expect(screen.queryByTestId("feedback-error")).toBeNull();
      const expectedInvalidFieldIds = [
        differencesFieldIds.moreBallotsCount,
        differencesFieldIds.unreturnedBallotsCount,
        differencesFieldIds.tooFewBallotsHandedOutCount,
        differencesFieldIds.tooManyBallotsHandedOutCount,
        differencesFieldIds.otherExplanationCount,
        differencesFieldIds.noExplanationCount,
      ];
      const expectedValidFieldIds = [differencesFieldIds.fewerBallotsCount];
      expectFieldsToBeInvalidAndToHaveAccessibleErrorMessage(expectedInvalidFieldIds, feedbackMessage);
      expectFieldsToHaveIconAndToHaveAccessibleName(expectedInvalidFieldIds, "bevat een waarschuwing");
      expectFieldsToBeValidAndToNotHaveAccessibleErrorMessage(expectedValidFieldIds);
      expectFieldsToNotHaveIcon(expectedValidFieldIds);
    });

    test("W.302 Incorrect total", async () => {
      const user = userEvent.setup();

      overrideServerGetDataEntryResponse({
        formState: defaultDataEntryState.formState,
        pollingStationResults: {
          recounted: false,
        },
      });

      renderForm();

      await screen.findByTestId("differences_form");
      overrideOnce("post", "/api/polling_stations/1/data_entries/1", 200, {
        validation_results: {
          errors: [],
          warnings: [
            {
              fields: [
                "data.differences_counts.fewer_ballots_count",
                "data.differences_counts.unreturned_ballots_count",
                "data.differences_counts.too_many_ballots_handed_out_count",
                "data.differences_counts.too_few_ballots_handed_out_count",
                "data.differences_counts.other_explanation_count",
                "data.differences_counts.no_explanation_count",
              ],
              code: "W302",
            },
          ],
        },
      });

      const submitButton = await screen.findByRole("button", { name: "Volgende" });
      await user.click(submitButton);

      const feedbackMessage =
        "Controleer ingevulde verschillenW.302De invoer bij J, K, L, M, N of O klopt niet.Check of je het papieren proces-verbaal goed hebt overgenomen.Heb je iets niet goed overgenomen? Herstel de fout en ga verder.Heb je alles gecontroleerd en komt je invoer overeen met het papier? Ga dan verder.";
      expect(await screen.findByTestId("feedback-warning")).toHaveTextContent(feedbackMessage);
      expect(screen.queryByTestId("feedback-error")).toBeNull();
      const expectedInvalidFieldIds = [
        differencesFieldIds.fewerBallotsCount,
        differencesFieldIds.unreturnedBallotsCount,
        differencesFieldIds.tooFewBallotsHandedOutCount,
        differencesFieldIds.tooManyBallotsHandedOutCount,
        differencesFieldIds.otherExplanationCount,
        differencesFieldIds.noExplanationCount,
      ];
      const expectedValidFieldIds = [differencesFieldIds.moreBallotsCount];
      expectFieldsToBeInvalidAndToHaveAccessibleErrorMessage(expectedInvalidFieldIds, feedbackMessage);
      expectFieldsToHaveIconAndToHaveAccessibleName(expectedInvalidFieldIds, "bevat een waarschuwing");
      expectFieldsToBeValidAndToNotHaveAccessibleErrorMessage(expectedValidFieldIds);
      expectFieldsToNotHaveIcon(expectedValidFieldIds);
    });
  });
});
