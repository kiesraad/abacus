import { UserEvent, userEvent } from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { electionMockData, politicalGroupMockData } from "@/testing/api-mocks/ElectionMockData";
import {
  PollingStationDataEntryClaimHandler,
  PollingStationDataEntrySaveHandler,
} from "@/testing/api-mocks/RequestHandlers";
import { overrideOnce, server } from "@/testing/server";
import { getUrlMethodAndBody, render, screen, within } from "@/testing/test-utils";
import {
  ElectionWithPoliticalGroups,
  PoliticalGroup,
  POLLING_STATION_DATA_ENTRY_SAVE_REQUEST_BODY,
} from "@/types/generated/openapi";

import { errorWarningMocks, getDefaultDataEntryState, getEmptyDataEntryRequest } from "../../testing/mock-data";
import {
  expectFieldsToBeInvalidAndToHaveAccessibleErrorMessage,
  expectFieldsToBeValidAndToNotHaveAccessibleErrorMessage,
  expectFieldsToHaveIconAndToHaveAccessibleName,
  expectFieldsToNotHaveIcon,
  getCandidateFullNamesFromMockData,
  overrideServerClaimDataEntryResponse,
} from "../../testing/test.utils";
import { DataEntryProvider } from "../DataEntryProvider";
import { CandidatesVotesForm } from "./CandidatesVotesForm";

function renderForm({ election, groupNumber }: { election?: ElectionWithPoliticalGroups; groupNumber?: number } = {}) {
  return render(
    <DataEntryProvider election={election || electionMockData} pollingStationId={1} entryNumber={1}>
      <CandidatesVotesForm groupNumber={groupNumber || 1} />
    </DataEntryProvider>,
  );
}

const candidatesFieldIds = {
  candidate0: "data.political_group_votes[0].candidate_votes[0].votes",
  candidate1: "data.political_group_votes[0].candidate_votes[1].votes",
  total: "data.political_group_votes[0].total",
};

describe("Test CandidatesVotesForm", () => {
  beforeEach(() => {
    server.use(PollingStationDataEntryClaimHandler, PollingStationDataEntrySaveHandler);
  });

  describe("CandidatesVotesForm renders correctly", () => {
    test("Candidates with first name", async () => {
      const election: ElectionWithPoliticalGroups = {
        ...electionMockData,
        political_groups: [
          {
            number: 1,
            name: "Lijst 1 - Vurige Vleugels Partij",
            candidates: [
              {
                number: 1,
                initials: "E.",
                first_name: "Eldor",
                last_name: "Zilverlicht",
                locality: "Amsterdam",
              },
            ],
          },
        ],
      };

      renderForm({ election });

      const candidateRow = await screen.findByTestId(`row-${candidatesFieldIds.candidate0}`);
      const candidateName = within(candidateRow).getAllByRole("cell")[2];
      expect(candidateName).toHaveTextContent(/^Zilverlicht, E\. \(Eldor\)$/);
    });

    test("Candidates without first names", async () => {
      const election: ElectionWithPoliticalGroups = {
        ...electionMockData,
        political_groups: [
          {
            number: 1,
            name: "Lijst 1 - Vurige Vleugels Partij",
            candidates: [
              {
                number: 1,
                initials: "E.",
                last_name: "Zilverlicht",
                locality: "Amsterdam",
              },
            ],
          },
        ],
      };

      renderForm({ election });

      const candidateRow = await screen.findByTestId("row-data.political_group_votes[0].candidate_votes[0].votes");
      const candidateName = within(candidateRow).getAllByRole("cell")[2];
      expect(candidateName).toHaveTextContent(/^Zilverlicht, E\.$/);
    });
  });

  describe("CandidatesVotesForm user interactions", () => {
    test("hitting enter key does not result in api call", async () => {
      const user = userEvent.setup();
      overrideServerClaimDataEntryResponse({
        formState: getDefaultDataEntryState().formState,
        pollingStationResults: {
          recounted: false,
        },
      });

      renderForm();

      const candidateNames = getCandidateFullNamesFromMockData(politicalGroupMockData);

      const candidate1 = await screen.findByRole("textbox", { name: `1 ${candidateNames[0]}` });
      await user.type(candidate1, "12345");
      expect(candidate1).toHaveValue("12345");

      const spy = vi.spyOn(global, "fetch");

      await user.keyboard("{enter}");

      expect(spy).not.toHaveBeenCalled();
    });

    test("Starting input doesn't render totals warning", async () => {
      const user = userEvent.setup();
      overrideServerClaimDataEntryResponse({
        formState: getDefaultDataEntryState().formState,
        pollingStationResults: {
          recounted: false,
        },
      });

      renderForm();

      const candidateNames = getCandidateFullNamesFromMockData(politicalGroupMockData);

      const candidate1 = await screen.findByRole("textbox", { name: `1 ${candidateNames[0]}` });
      await user.type(candidate1, "12345");
      expect(screen.queryByTestId("missing-total-error")).not.toBeInTheDocument();
    });

    test("hitting shift+enter does result in api call", async () => {
      const user = userEvent.setup();
      overrideServerClaimDataEntryResponse({
        formState: getDefaultDataEntryState().formState,
        pollingStationResults: {
          recounted: false,
        },
      });

      renderForm();
      const spy = vi.spyOn(global, "fetch");

      const candidateNames = getCandidateFullNamesFromMockData(politicalGroupMockData);

      const candidate1 = await screen.findByRole("textbox", { name: `1 ${candidateNames[0]}` });
      await user.type(candidate1, "12345");
      expect(candidate1).toHaveValue("12345");

      const total = screen.getByRole("textbox", { name: "Totaal lijst 1" });
      await user.type(total, "12345");

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
        pollingStationResults: {
          recounted: false,
        },
      });
      renderForm();

      const candidateNames = getCandidateFullNamesFromMockData(politicalGroupMockData);

      const candidate1 = await screen.findByRole("textbox", { name: `1 ${candidateNames[0]}` });
      expect(candidate1.closest("fieldset")).toHaveAccessibleName("Lijst 1 - Vurige Vleugels Partij");
      expect(candidate1).toHaveAccessibleName("1 Zilverlicht, E. (Eldor)");
      expect(candidate1).toHaveFocus();
      await user.type(candidate1, "12345");
      expect(candidate1).toHaveValue("12345");

      await user.keyboard("{enter}");

      const candidate2 = screen.getByRole("textbox", { name: `2 ${candidateNames[1]}` });
      expect(candidate2).toHaveFocus();
      await user.type(candidate2, "6789");
      expect(candidate2).toHaveValue("6789");

      await user.keyboard("{enter}");

      const candidate3 = screen.getByRole("textbox", { name: `3 ${candidateNames[2]}` });
      expect(candidate3).toHaveFocus();
      await user.type(candidate3, "123");
      expect(candidate3).toHaveValue("123");

      await user.keyboard("{enter}");

      const candidate4 = screen.getByRole("textbox", { name: `4 ${candidateNames[3]}` });
      expect(candidate4).toHaveFocus();
      await user.paste("4242");
      expect(candidate4).toHaveValue("4242");

      await user.keyboard("{enter}");

      const candidate5 = screen.getByRole("textbox", { name: `5 ${candidateNames[4]}` });
      expect(candidate5).toHaveFocus();
      await user.type(candidate5, "12");
      expect(candidate5).toHaveValue("12");

      await user.keyboard("{enter}");

      const candidate6 = screen.getByRole("textbox", { name: `6 ${candidateNames[5]}` });
      expect(candidate6).toHaveFocus();
      // Test if maxLength on field works
      await user.type(candidate6, "1234567890");
      expect(candidate6).toHaveValue("123456789");

      await user.keyboard("{enter}");

      const candidate7 = screen.getByRole("textbox", { name: `7 ${candidateNames[6]}` });
      expect(candidate7).toHaveFocus();
      await user.type(candidate7, "3");
      expect(candidate7).toHaveValue("3");

      await user.keyboard("{enter}");

      // this field contains 0 by default, adding '555' will result in '0555'
      // that is why we need to use initialSelectionStart and initialSelectionEnd
      const total = screen.getByRole("textbox", { name: "Totaal lijst 1" });
      await user.click(total);
      expect(total).toHaveFocus();
      await user.type(total, "555", { initialSelectionStart: 0, initialSelectionEnd: 10 });
      expect(total).toHaveValue("555");

      const submitButton = screen.getByRole("button", { name: "Volgende" });
      await user.click(submitButton);
    });
  });

  describe("CandidatesVotesForm API request and response", () => {
    test("CandidateVotesForm request body is equal to the form data", async () => {
      const politicalGroupMockData: PoliticalGroup = {
        number: 1,
        name: "Lijst 1 - Vurige Vleugels Partij",
        candidates: [
          {
            number: 1,
            initials: "E.",
            first_name: "Eldor",
            last_name: "Zilverlicht",
            locality: "Amsterdam",
          },
          {
            number: 2,
            initials: "G.",
            first_name: "Grom",
            last_name: "Donderbrul",
            locality: "Rotterdam",
          },
        ],
      };

      const electionMockData: ElectionWithPoliticalGroups = {
        id: 1,
        name: "Gemeenteraadsverkiezingen 2026",
        election_id: "Heemdamseburg_2024",
        location: "Heemdamseburg",
        domain_id: "0000",
        number_of_voters: 100,
        category: "Municipal",
        number_of_seats: 29,
        election_date: "2024-11-30",
        nomination_date: "2024-11-01",
        status: "DataEntryInProgress",
        political_groups: [
          politicalGroupMockData,
          {
            number: 2,
            name: "Lijst 2 - Wijzen van Water en Wind",
            candidates: [
              {
                number: 1,
                initials: "A.",
                first_name: "Alice",
                last_name: "Foo",
                locality: "Amsterdam",
                gender: "Female",
              },
              {
                number: 2,
                initials: "C.",
                first_name: "Charlie",
                last_name: "Doe",
                locality: "Rotterdam",
              },
            ],
          },
        ],
      };

      overrideServerClaimDataEntryResponse({
        formState: getDefaultDataEntryState().formState,
        pollingStationResults: {
          ...getEmptyDataEntryRequest().data,
          political_group_votes: [
            {
              number: 1,
              total: 0,
              candidate_votes: [
                {
                  number: 1,
                  votes: 0,
                },
                {
                  number: 2,
                  votes: 0,
                },
              ],
            },
            {
              number: 2,
              total: 0,
              candidate_votes: [
                {
                  number: 1,
                  votes: 0,
                },
                {
                  number: 2,
                  votes: 0,
                },
              ],
            },
          ],
        },
      });
      renderForm({ election: electionMockData });

      const expectedRequest = {
        data: {
          ...getEmptyDataEntryRequest().data,
          political_group_votes: [
            {
              number: 1,
              total: 10,
              candidate_votes: [
                {
                  number: 1,
                  votes: 5,
                },
                {
                  number: 2,
                  votes: 5,
                },
              ],
            },
            {
              number: 2,
              total: 0,
              candidate_votes: [
                {
                  number: 1,
                  votes: 0,
                },
                {
                  number: 2,
                  votes: 0,
                },
              ],
            },
          ],
        },
      };

      const user = userEvent.setup();

      const candidateNames = getCandidateFullNamesFromMockData(politicalGroupMockData);

      const candidate1 = await screen.findByRole("textbox", { name: `1 ${candidateNames[0]}` });
      const candidate2 = screen.getByRole("textbox", { name: `2 ${candidateNames[1]}` });
      const total = screen.getByRole("textbox", { name: "Totaal lijst 1" });

      const spy = vi.spyOn(global, "fetch");

      await user.type(
        candidate1,
        expectedRequest.data.political_group_votes[0]?.candidate_votes[0]?.votes.toString() ?? "0",
      );

      await user.type(
        candidate2,
        expectedRequest.data.political_group_votes[0]?.candidate_votes[1]?.votes.toString() ?? "0",
      );

      await user.type(total, expectedRequest.data.political_group_votes[0]?.total.toString() ?? "0");

      const submitButton = screen.getByRole("button", { name: "Volgende" });
      await user.click(submitButton);

      expect(spy).toHaveBeenCalled();
      const { url, method, body } = getUrlMethodAndBody(spy.mock.calls);
      expect(url).toEqual("/api/polling_stations/1/data_entries/1");
      expect(method).toEqual("POST");
      const request_body = body as POLLING_STATION_DATA_ENTRY_SAVE_REQUEST_BODY;
      expect(request_body.data).toEqual(expectedRequest.data);
    });
  });

  describe("CandidatesVotesForm client-side errors", () => {
    test("Show error when list total is empty", async () => {
      const user = userEvent.setup();

      overrideServerClaimDataEntryResponse({
        formState: getDefaultDataEntryState().formState,
        pollingStationResults: {
          recounted: false,
        },
      });
      renderForm();

      const candidateNames = getCandidateFullNamesFromMockData(politicalGroupMockData);

      const candidate1 = await screen.findByRole("textbox", { name: `1 ${candidateNames[0]}` });
      const candidate2 = screen.getByRole("textbox", { name: `2 ${candidateNames[1]}` });
      const total = screen.getByRole("textbox", { name: "Totaal lijst 1" });

      const spy = vi.spyOn(global, "fetch");

      await user.type(candidate1, "10");

      await user.type(candidate2, "20");

      // First submit before adding a total
      const submitButton = screen.getByRole("button", { name: "Volgende" });
      await user.click(submitButton);

      expect(spy).not.toHaveBeenCalled();
      const feedbackMessage =
        "Controleer het totaal van de lijst. Overleg met de coördinator als op het papier niets is ingevuld.";
      expect(await screen.findByTestId("missing-total-error")).toHaveTextContent(feedbackMessage);
      expect(await screen.findByRole("textbox", { name: "Totaal lijst 1" })).toHaveFocus();
      const expectedInvalidFieldIds = [candidatesFieldIds.total];
      const expectedValidFieldIds = [candidatesFieldIds.candidate0, candidatesFieldIds.candidate1];
      expectFieldsToBeInvalidAndToHaveAccessibleErrorMessage(expectedInvalidFieldIds, feedbackMessage);
      expectFieldsToHaveIconAndToHaveAccessibleName(expectedInvalidFieldIds, "bevat een fout");
      expectFieldsToBeValidAndToNotHaveAccessibleErrorMessage(expectedValidFieldIds);
      expectFieldsToNotHaveIcon(expectedValidFieldIds);

      // Add the total and submit again
      await user.type(total, "1");
      await user.click(submitButton);

      expect(screen.queryByTestId("missing-total-error")).not.toBeInTheDocument();
      expect(spy).toHaveBeenCalledOnce();
    });
  });

  describe("CandidatesVotesForm errors", () => {
    test("F.401 IncorrectTotal group total", async () => {
      const user = userEvent.setup();

      overrideServerClaimDataEntryResponse({
        formState: getDefaultDataEntryState().formState,
        pollingStationResults: {
          recounted: false,
        },
      });
      renderForm();

      await screen.findByTestId("political_group_votes_1_form");
      overrideOnce("post", "/api/polling_stations/1/data_entries/1", 200, {
        validation_results: { errors: [errorWarningMocks.F401], warnings: [] },
      });

      const submitButton = await screen.findByRole("button", { name: "Volgende" });
      await user.click(submitButton);

      const feedbackMessage =
        "Controleer ingevoerde aantallenF.401De opgetelde stemmen op de kandidaten en het ingevoerde totaal zijn niet gelijk.Check of je het papieren proces-verbaal goed hebt overgenomen.Heb je iets niet goed overgenomen? Herstel de fout en ga verder.Heb je alles goed overgenomen, en blijft de fout? Dan mag je niet verder. Overleg met de coördinator.";
      expect(await screen.findByTestId("feedback-error")).toHaveTextContent(feedbackMessage);
      expect(screen.queryByTestId("feedback-warning")).toBeNull();
      // When all fields on a page are (potentially) invalid, we do not mark them as so
      const expectedValidFields = [
        candidatesFieldIds.candidate0,
        candidatesFieldIds.candidate1,
        candidatesFieldIds.total,
      ];
      expectFieldsToBeValidAndToNotHaveAccessibleErrorMessage(expectedValidFields);
      expectFieldsToNotHaveIcon(expectedValidFields);
    });
  });

  describe("CandidatesVotesForm warnings", () => {
    test("Imagined warning on this form", async () => {
      const user = userEvent.setup();
      overrideServerClaimDataEntryResponse({
        formState: getDefaultDataEntryState().formState,
        pollingStationResults: {
          recounted: false,
        },
      });
      renderForm();

      await screen.findByTestId("political_group_votes_1_form");
      overrideOnce("post", "/api/polling_stations/1/data_entries/1", 200, {
        validation_results: {
          errors: [],
          warnings: [{ fields: ["data.political_group_votes[0]"], code: "F401" }],
        },
      });

      const submitButton = await screen.findByRole("button", { name: "Volgende" });
      await user.click(submitButton);

      const feedbackMessage =
        "Controleer ingevoerde aantallenF.401De opgetelde stemmen op de kandidaten en het ingevoerde totaal zijn niet gelijk.Check of je het papieren proces-verbaal goed hebt overgenomen.Heb je iets niet goed overgenomen? Herstel de fout en ga verder.Heb je alles gecontroleerd en komt je invoer overeen met het papier? Ga dan verder.";
      expect(await screen.findByTestId("feedback-warning")).toHaveTextContent(feedbackMessage);
      expect(screen.queryByTestId("feedback-error")).toBeNull();
      // When all fields on a page are (potentially) invalid, we do not mark them as so
      const expectedValidFieldIds = [
        candidatesFieldIds.candidate0,
        candidatesFieldIds.candidate1,
        candidatesFieldIds.total,
      ];
      expectFieldsToBeValidAndToNotHaveAccessibleErrorMessage(expectedValidFieldIds);
      expectFieldsToNotHaveIcon(expectedValidFieldIds);
    });
  });

  describe("CandidatesVotesForm accept warnings", () => {
    let user: UserEvent;
    let submitButton: HTMLButtonElement;
    let acceptErrorsAndWarningsCheckbox: HTMLInputElement;

    beforeEach(async () => {
      overrideOnce("post", "/api/polling_stations/1/data_entries/1", 200, {
        validation_results: {
          errors: [],
          warnings: [{ fields: ["data.political_group_votes[0]"], code: "F401" }],
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

      const candidateNames = getCandidateFullNamesFromMockData(politicalGroupMockData);

      const input = screen.getByRole("textbox", { name: `2 ${candidateNames[1]}` });
      await user.type(input, "1");

      expect(acceptErrorsAndWarningsCheckbox).not.toBeVisible();
    });

    test("checkbox with error should disappear when filling in any form input", async () => {
      expect(acceptErrorsAndWarningsCheckbox).toBeVisible();
      expect(acceptErrorsAndWarningsCheckbox).not.toBeInvalid();

      await user.click(submitButton);

      expect(acceptErrorsAndWarningsCheckbox).toBeInvalid();
      const acceptErrorsAndWarningsError = await screen.findByRole("alert", {
        description: "Je kan alleen verder als je het papieren proces-verbaal hebt gecontroleerd.",
      });
      expect(acceptErrorsAndWarningsError).toBeVisible();

      const candidateNames = getCandidateFullNamesFromMockData(politicalGroupMockData);

      const input = screen.getByRole("textbox", { name: `2 ${candidateNames[1]}` });
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
});
