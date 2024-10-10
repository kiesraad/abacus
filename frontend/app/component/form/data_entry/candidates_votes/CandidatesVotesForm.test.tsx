import { userEvent } from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";

import {
  expectFieldsToBeValidAndToNotHaveAccessibleErrorMessage,
  expectFieldsToNotHaveIcon,
} from "app/component/form/testHelperFunctions";
import { getUrlMethodAndBody, overrideOnce, render, screen } from "app/test/unit";
import { emptyDataEntryRequest } from "app/test/unit/form";

import {
  Election,
  PoliticalGroup,
  POLLING_STATION_DATA_ENTRY_SAVE_REQUEST_BODY,
  PollingStationFormController,
  PollingStationResults,
} from "@kiesraad/api";
import { electionMockData, politicalGroupMockData, pollingStationMockData } from "@kiesraad/api-mocks";

import { CandidatesVotesForm } from "./CandidatesVotesForm";

function renderForm(defaultValues: Partial<PollingStationResults> = {}) {
  return render(
    <PollingStationFormController
      election={electionMockData}
      pollingStationId={1}
      entryNumber={1}
      defaultValues={defaultValues}
    >
      <CandidatesVotesForm group={politicalGroupMockData} />
    </PollingStationFormController>,
  );
}

const candidatesFieldIds = {
  candidate0: "candidate_votes[0].votes",
  candidate1: "candidate_votes[1].votes",
  total: "total",
};

describe("Test CandidatesVotesForm", () => {
  describe("CandidatesVotesForm user interactions", () => {
    test("hitting enter key does not result in api call", async () => {
      const user = userEvent.setup();

      renderForm({ recounted: false });

      const candidate1 = await screen.findByTestId("candidate_votes[0].votes");
      await user.type(candidate1, "12345");
      expect(candidate1).toHaveValue("12345");

      const spy = vi.spyOn(global, "fetch");

      await user.keyboard("{enter}");

      expect(spy).not.toHaveBeenCalled();
    });

    test("hitting shift+enter does result in api call", async () => {
      const user = userEvent.setup();

      renderForm({ recounted: false });
      const spy = vi.spyOn(global, "fetch");

      const candidate1 = await screen.findByTestId("candidate_votes[0].votes");
      await user.type(candidate1, "12345");
      expect(candidate1).toHaveValue("12345");

      await user.keyboard("{shift>}{enter}{/shift}");

      expect(spy).toHaveBeenCalled();
    });

    test("Form field entry and keybindings", async () => {
      overrideOnce("post", "/api/polling_stations/1/data_entries/1", 200, {
        validation_results: { errors: [], warnings: [] },
      });

      const user = userEvent.setup();

      renderForm({ recounted: false });

      const formTitle = await screen.findByRole("heading", { level: 2, name: "Lijst 1 - Vurige Vleugels Partij" });
      expect(formTitle).toHaveFocus();
      await user.keyboard("{tab}");

      const candidate1 = await screen.findByTestId("candidate_votes[0].votes");
      expect(candidate1).toHaveFocus();
      await user.type(candidate1, "12345");
      expect(candidate1).toHaveValue("12345");

      await user.keyboard("{enter}");

      const candidate2 = screen.getByTestId("candidate_votes[1].votes");
      expect(candidate2).toHaveFocus();
      await user.type(candidate2, "6789");
      expect(candidate2).toHaveValue("6789");

      await user.keyboard("{enter}");

      const candidate3 = screen.getByTestId("candidate_votes[2].votes");
      expect(candidate3).toHaveFocus();
      await user.type(candidate3, "123");
      expect(candidate3).toHaveValue("123");

      await user.keyboard("{enter}");

      const candidate4 = screen.getByTestId("candidate_votes[3].votes");
      expect(candidate4).toHaveFocus();
      await user.paste("4242");
      expect(candidate4).toHaveValue("4242");

      await user.keyboard("{enter}");

      const candidate5 = screen.getByTestId("candidate_votes[4].votes");
      expect(candidate5).toHaveFocus();
      await user.type(candidate5, "12");
      expect(candidate5).toHaveValue("12");

      await user.keyboard("{enter}");

      const candidate6 = screen.getByTestId("candidate_votes[5].votes");
      expect(candidate6).toHaveFocus();
      // Test if maxLength on field works
      await user.type(candidate6, "1234567890");
      expect(candidate6).toHaveValue("123456789");

      await user.keyboard("{enter}");

      const candidate7 = screen.getByTestId("candidate_votes[6].votes");
      expect(candidate7).toHaveFocus();
      await user.type(candidate7, "3");
      expect(candidate7).toHaveValue("3");

      await user.keyboard("{enter}");

      const total = screen.getByTestId("total");
      await user.click(total);
      expect(total).toHaveFocus();
      await user.type(total, "555");
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

      const electionMockData: Required<Election> = {
        id: 1,
        name: "Gemeenteraadsverkiezingen 2026",
        location: "Heemdamseburg",
        number_of_voters: 100,
        category: "Municipal",
        election_date: "2024-11-30",
        nomination_date: "2024-11-01",
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

      const politicalGroupMock = politicalGroupMockData as Required<PoliticalGroup>;

      const Component = (
        <PollingStationFormController
          election={electionMockData}
          pollingStationId={pollingStationMockData.id}
          entryNumber={1}
        >
          <CandidatesVotesForm group={politicalGroupMock} />
        </PollingStationFormController>
      );

      const expectedRequest = {
        data: {
          ...emptyDataEntryRequest.data,
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

      render(Component);

      const candidateVotes0 = await screen.findByTestId("candidate_votes[0].votes");
      const candidateVotes1 = screen.getByTestId("candidate_votes[1].votes");
      const total = screen.getByTestId("total");

      const spy = vi.spyOn(global, "fetch");

      await user.type(
        candidateVotes0,
        expectedRequest.data.political_group_votes[0]?.candidate_votes[0]?.votes.toString() ?? "0",
      );

      await user.type(
        candidateVotes1,
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

  describe("CandidatesVotesForm errors", () => {
    test("F.401 IncorrectTotal group total", async () => {
      const user = userEvent.setup();

      renderForm({ recounted: false });

      await screen.findByTestId("candidates_form_1");
      overrideOnce("post", "/api/polling_stations/1/data_entries/1", 200, {
        validation_results: {
          errors: [{ fields: ["data.political_group_votes[0]"], code: "F401" }],
          warnings: [],
        },
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

      renderForm({ recounted: false });

      await screen.findByTestId("candidates_form_1");
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
});
