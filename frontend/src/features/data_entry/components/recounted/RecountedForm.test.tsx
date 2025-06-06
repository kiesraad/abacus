import { UserEvent, userEvent } from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { electionMockData } from "@/testing/api-mocks/ElectionMockData";
import {
  PollingStationDataEntryClaimHandler,
  PollingStationDataEntrySaveHandler,
} from "@/testing/api-mocks/RequestHandlers";
import { overrideOnce, server } from "@/testing/server";
import { getUrlMethodAndBody, render, screen } from "@/testing/test-utils";
import { POLLING_STATION_DATA_ENTRY_SAVE_REQUEST_BODY, SaveDataEntryResponse } from "@/types/generated/openapi";

import { errorWarningMocks, getEmptyDataEntryRequest } from "../../testing/mock-data";
import { DataEntryProvider } from "../DataEntryProvider";
import { RecountedForm } from "./RecountedForm";

function renderForm() {
  return render(
    <DataEntryProvider election={electionMockData} pollingStationId={1} entryNumber={1}>
      <RecountedForm />
    </DataEntryProvider>,
  );
}

describe("Test RecountedForm", () => {
  beforeEach(() => {
    server.use(PollingStationDataEntryClaimHandler, PollingStationDataEntrySaveHandler);
  });
  describe("RecountedForm user interactions", () => {
    test("hitting enter key does not result in api call", async () => {
      renderForm();

      const user = userEvent.setup();

      const yes = await screen.findByLabelText("Ja, er was een hertelling");
      await user.click(yes);
      expect(yes).toBeChecked();

      const spy = vi.spyOn(global, "fetch");

      await user.keyboard("{enter}");

      expect(spy).not.toHaveBeenCalled();
    });

    test("hitting shift+enter does result in api call", async () => {
      renderForm();

      const user = userEvent.setup();
      const spy = vi.spyOn(global, "fetch");

      const yes = await screen.findByLabelText("Ja, er was een hertelling");
      await user.click(yes);
      expect(yes).toBeChecked();

      await user.keyboard("{shift>}{enter}{/shift}");

      expect(spy).toHaveBeenCalled();
    });

    test("Form field entry and keybindings", async () => {
      overrideOnce("post", "/api/polling_stations/1/data_entries/1", 200, {
        validation_results: { errors: [], warnings: [] },
      });

      const user = userEvent.setup();

      renderForm();

      const yes = await screen.findByLabelText("Ja, er was een hertelling");
      const no = await screen.findByLabelText("Nee, er was geen hertelling");
      expect(yes).toHaveFocus();
      expect(yes).not.toBeChecked();
      expect(no).not.toBeChecked();

      await user.click(yes);
      expect(yes).toBeChecked();
      expect(no).not.toBeChecked();
      await user.click(no);
      expect(no).toBeChecked();
      expect(yes).not.toBeChecked();

      const submitButton = screen.getByRole("button", { name: "Volgende" });
      await user.click(submitButton);
    });
  });

  describe("RecountedForm API request and response", () => {
    test("RecountedForm request body is equal to the form data", async () => {
      const expectedRequest = {
        data: {
          ...getEmptyDataEntryRequest().data,
          recounted: true,
          voters_recounts: {
            poll_card_count: 0,
            proxy_certificate_count: 0,
            voter_card_count: 0,
            total_admitted_voters_count: 0,
          },
        },
        client_state: {},
      };

      renderForm();

      const user = userEvent.setup();

      const yes = await screen.findByLabelText("Ja, er was een hertelling");
      await user.click(yes);

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

  describe("RecountedForm errors", () => {
    test("F.101 No radio selected", async () => {
      overrideOnce("post", "/api/polling_stations/1/data_entries/1", 200, {
        validation_results: {
          errors: [
            {
              code: "F101",
              fields: ["data.recounted"],
            },
          ],
          warnings: [],
        },
      });

      const user = userEvent.setup();

      renderForm();

      const yes = await screen.findByLabelText("Ja, er was een hertelling");
      const no = await screen.findByLabelText("Nee, er was geen hertelling");
      const submitButton = screen.getByRole("button", { name: "Volgende" });

      expect(yes).not.toBeChecked();
      expect(no).not.toBeChecked();

      overrideOnce("post", "/api/polling_stations/1/data_entries/1", 200, {
        validation_results: { errors: [errorWarningMocks.F101], warnings: [] },
      } as SaveDataEntryResponse);

      await user.click(submitButton);

      expect(await screen.findByTestId("feedback-error")).toHaveTextContent(
        "Controleer het papieren proces-verbaalF.101Is op pagina 1 aangegeven dat er in opdracht van het Gemeentelijk Stembureau is herteld?Controleer of rubriek 3 is ingevuld. Is dat zo? Kies hieronder 'ja'Wel een vinkje, maar rubriek 3 niet ingevuld? Overleg met de coördinatorGeen vinkje? Kies dan 'nee'.",
      );
      expect(screen.queryByTestId("feedback-warning")).toBeNull();
    });
  });

  describe("RecountedForm warnings", () => {
    test("clicking next without accepting warning results in alert shown and then accept warning", async () => {
      const user = userEvent.setup();

      renderForm();

      await screen.findByTestId("recounted_form");
      overrideOnce("post", "/api/polling_stations/1/data_entries/1", 200, {
        validation_results: { errors: [], warnings: [errorWarningMocks.W001] },
      });

      const submitButton = await screen.findByRole("button", { name: "Volgende" });
      await user.click(submitButton);

      const feedbackMessage =
        "Verschil met eerste invoer. Extra controle nodigW.001Check of je de gemarkeerde velden goed hebt overgenomen van het papieren proces-verbaal.Heb je iets niet goed overgenomen? Herstel de fout en ga verder.Heb je alles gecontroleerd en komt je invoer overeen met het papier? Ga dan verder.";
      const feedbackWarning = await screen.findByTestId("feedback-warning");
      expect(feedbackWarning).toHaveTextContent(feedbackMessage);
      expect(screen.queryByTestId("feedback-error")).toBeNull();
      const recountedError = await screen.findByTestId("recounted-error");
      expect(recountedError).toHaveTextContent("Controleer of je antwoord gelijk is aan het papieren proces-verbaal");

      const acceptFeedbackCheckbox = screen.getByRole("checkbox", {
        name: "Ik heb mijn invoer gecontroleerd met het papier en correct overgenomen.",
      });
      expect(acceptFeedbackCheckbox).not.toBeChecked();

      await user.click(submitButton);
      const alertText = screen.getByRole("alert");
      expect(alertText).toHaveTextContent(
        "Je kan alleen verder als je het papieren proces-verbaal hebt gecontroleerd.",
      );

      acceptFeedbackCheckbox.click();
      await user.click(submitButton);

      expect(feedbackWarning).toHaveTextContent(feedbackMessage);
      // All fields should be considered valid now
      expect(screen.queryByTestId("recounted-error")).toBeNull();
    });

    test("W.001 Difference with first entry", async () => {
      const user = userEvent.setup();

      renderForm();

      await screen.findByTestId("recounted_form");
      overrideOnce("post", "/api/polling_stations/1/data_entries/1", 200, {
        validation_results: { errors: [], warnings: [errorWarningMocks.W001] },
      });

      const submitButton = await screen.findByRole("button", { name: "Volgende" });
      await user.click(submitButton);

      const feedbackMessage =
        "Verschil met eerste invoer. Extra controle nodigW.001Check of je de gemarkeerde velden goed hebt overgenomen van het papieren proces-verbaal.Heb je iets niet goed overgenomen? Herstel de fout en ga verder.Heb je alles gecontroleerd en komt je invoer overeen met het papier? Ga dan verder.";
      const feedbackWarning = await screen.findByTestId("feedback-warning");
      expect(feedbackWarning).toHaveTextContent(feedbackMessage);
      expect(screen.queryByTestId("feedback-error")).toBeNull();
      const recountedError = await screen.findByTestId("recounted-error");
      expect(recountedError).toHaveTextContent("Controleer of je antwoord gelijk is aan het papieren proces-verbaal");
    });
  });

  describe("RecountedForm accept warnings", () => {
    let user: UserEvent;
    let submitButton: HTMLButtonElement;
    let acceptErrorsAndWarningsCheckbox: HTMLInputElement;

    beforeEach(async () => {
      overrideOnce("post", "/api/polling_stations/1/data_entries/1", 200, {
        validation_results: { errors: [], warnings: [errorWarningMocks.W001] },
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

      const yes = await screen.findByLabelText("Ja, er was een hertelling");
      await user.click(yes);

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

      const yes = await screen.findByLabelText("Ja, er was een hertelling");
      await user.click(yes);

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
