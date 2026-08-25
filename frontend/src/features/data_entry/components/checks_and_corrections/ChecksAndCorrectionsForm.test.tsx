import { userEvent } from "@testing-library/user-event";
import * as ReactRouter from "react-router";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { MessagesProvider } from "@/hooks/messages/MessagesProvider";
import * as useUser from "@/hooks/user/useUser";
import { electionMockData } from "@/testing/api-mocks/ElectionMockData";
import { pollingStationMockData } from "@/testing/api-mocks/PollingStationMockData";
import { DataEntryClaimHandler, DataEntrySaveHandler } from "@/testing/api-mocks/RequestHandlers";
import { validationResultMockData } from "@/testing/api-mocks/ValidationResultMockData";
import { overrideOnce, server } from "@/testing/server";
import { getUrlMethodAndBody, render, screen } from "@/testing/test-utils";
import { getTypistUser } from "@/testing/user-mock-data";
import type { DATA_ENTRY_SAVE_REQUEST_BODY } from "@/types/generated/openapi";
import { getDefaultDSODataEntryState, getEmptyDSODataEntryRequest } from "../../testing/mock-data";
import { overrideServerClaimDataEntryResponse } from "../../testing/test.utils";
import { DataEntryProvider } from "../DataEntryProvider";
import { DataEntrySection } from "../DataEntrySection";

function renderForm() {
  vi.spyOn(ReactRouter, "useParams").mockReturnValue({ sectionId: "checks_and_corrections" });

  return render(
    <MessagesProvider>
      <DataEntryProvider
        election={electionMockData}
        dataEntryId={pollingStationMockData[0]!.data_entry_id!}
        entryNumber={1}
      >
        <DataEntrySection committeeCategory={electionMockData.committee_category} />
      </DataEntryProvider>
    </MessagesProvider>,
  );
}

describe("Test ChecksAndCorrectionsForm", () => {
  beforeEach(() => {
    vi.spyOn(useUser, "useUser").mockReturnValue(getTypistUser());
    server.use(DataEntryClaimHandler, DataEntrySaveHandler);
  });

  describe("ChecksAndCorrectionsForm user interactions", () => {
    test("hitting enter key does not result in api call", async () => {
      const user = userEvent.setup();

      overrideServerClaimDataEntryResponse({
        formState: getDefaultDSODataEntryState().formState,
        results: {},
        model: "DSOFirstSession",
      });
      renderForm();

      const unaccountedDifference = await screen.findByRole("checkbox", {
        name: "Vanwege een onverklaard verschil",
      });
      await user.click(unaccountedDifference);
      expect(unaccountedDifference).toBeChecked();

      const spy = vi.spyOn(global, "fetch");

      await user.keyboard("{enter}");

      expect(spy).not.toHaveBeenCalled();
    });

    test("hitting shift+enter does result in api call", async () => {
      const user = userEvent.setup();
      overrideServerClaimDataEntryResponse({
        formState: getDefaultDSODataEntryState().formState,
        results: {},
        model: "DSOFirstSession",
      });

      renderForm();
      const spy = vi.spyOn(global, "fetch");

      const unaccountedDifference = await screen.findByRole("checkbox", {
        name: "Vanwege een onverklaard verschil",
      });
      await user.click(unaccountedDifference);
      expect(unaccountedDifference).toBeChecked();

      await user.keyboard("{shift>}{enter}{/shift}");

      expect(spy).toHaveBeenCalled();
    });

    test("Form field entry and keybindings", async () => {
      overrideOnce("post", "/api/data_entries/1/1", 200, {
        validation_results: { errors: [], warnings: [] },
      });

      const user = userEvent.setup();
      overrideServerClaimDataEntryResponse({
        formState: getDefaultDSODataEntryState().formState,
        results: {},
        model: "DSOFirstSession",
      });
      renderForm();

      const unaccountedDifference = await screen.findByRole("checkbox", {
        name: "Vanwege een onverklaard verschil",
      });
      expect(unaccountedDifference).toHaveFocus();
      expect(unaccountedDifference).not.toBeChecked();
      await user.keyboard(" ");
      expect(unaccountedDifference).toBeChecked();

      await user.keyboard("{enter}");

      const otherError = await screen.findByRole("checkbox", {
        name: "Vanwege (het vermoeden van) een andere fout",
      });
      expect(otherError).toHaveFocus();
      await user.keyboard(" ");
      expect(otherError).toBeChecked();

      await user.keyboard("{enter}");
      await user.keyboard("{enter}");

      const correctedResultsYes = await screen.findAllByRole("checkbox", {
        name: "Ja, er zijn gecorrigeerde telresultaten",
      });
      expect(correctedResultsYes).toHaveLength(2);
      expect(correctedResultsYes[0]).toHaveFocus();
      await user.keyboard(" ");
      expect(correctedResultsYes[0]).toBeChecked();

      await user.keyboard("{enter}");
      await user.keyboard("{enter}");

      const submitButton = screen.getByRole("button", { name: "Volgende" });
      await user.click(submitButton);
    });
  });

  describe("ChecksAndCorrectionsForm API request and response", () => {
    test("ChecksAndCorrectionsForm request body is equal to the form data", async () => {
      const expectedRequest = {
        data: {
          ...getEmptyDSODataEntryRequest().data,
          about_report: {
            corrigendum_present: "TwoDocuments",
            checks_and_corrections_present: "PagePresent",
          },
          checks_and_corrections: {
            reason_investigation_own_initiative: {
              unaccounted_difference: true,
              other_error: true,
            },
            corrected_results_own_initiative: {
              yes: true,
              no: false,
            },
            corrected_results_csb_request: {
              yes: false,
              no: false,
            },
          },
        },
        client_state: {},
      };

      const user = userEvent.setup();
      overrideServerClaimDataEntryResponse({
        formState: getDefaultDSODataEntryState().formState,
        results: {
          about_report: {
            corrigendum_present: "TwoDocuments",
            checks_and_corrections_present: "PagePresent",
          },
        },
        model: "DSOFirstSession",
      });

      renderForm();

      await screen.findByTestId("checks_and_corrections_form");
      const spy = vi.spyOn(global, "fetch");

      const unaccountedDifference = await screen.findByRole("checkbox", {
        name: "Vanwege een onverklaard verschil",
      });
      await user.click(unaccountedDifference);
      expect(unaccountedDifference).toBeChecked();

      const otherError = await screen.findByRole("checkbox", {
        name: "Vanwege (het vermoeden van) een andere fout",
      });
      await user.click(otherError);
      expect(otherError).toBeChecked();

      const correctedResultsYes = await screen.findAllByRole("checkbox", {
        name: "Ja, er zijn gecorrigeerde telresultaten",
      });
      expect(correctedResultsYes).toHaveLength(2);
      const correctedResultsYesOwnInitiative = correctedResultsYes[0]!;
      await user.click(correctedResultsYesOwnInitiative);
      expect(correctedResultsYesOwnInitiative).toBeChecked();

      const submitButton = await screen.findByRole("button", { name: "Volgende" });
      await user.click(submitButton);

      expect(spy).toHaveBeenCalled();
      const { url, method, body } = getUrlMethodAndBody(spy.mock.calls);
      expect(url).toEqual("/api/data_entries/1/1");
      expect(method).toEqual("POST");
      const request_body = body as DATA_ENTRY_SAVE_REQUEST_BODY;
      expect(request_body.data).toEqual(expectedRequest.data);
    });
  });

  describe("ChecksAndCorrectionsForm errors", () => {
    test("F.131 Checkboxes not checked", async () => {
      const user = userEvent.setup();

      overrideServerClaimDataEntryResponse({
        formState: getDefaultDSODataEntryState().formState,
        results: {},
        model: "DSOFirstSession",
      });
      renderForm();

      await screen.findByTestId("checks_and_corrections_form");
      overrideOnce("post", "/api/data_entries/1/1", 200, {
        validation_results: { errors: [validationResultMockData.F131], warnings: [] },
      });

      const submitButton = await screen.findByRole("button", { name: "Volgende" });
      await user.click(submitButton);

      const feedbackMessage = [
        "Controleer je antwoorden",
        "F.131",
        "Heb je iets niet goed overgenomen? Herstel de fout en ga verder.",
        "Heb je alles gecontroleerd en komt je invoer overeen met het papier? Ga dan verder.",
      ].join("");

      expect(await screen.findByTestId("feedback-error")).toHaveTextContent(feedbackMessage);
      expect(screen.queryByTestId("feedback-warning")).toBeNull();
    });

    test("F.132 Corrigendum but no corrected results own initiative", async () => {
      const user = userEvent.setup();
      overrideServerClaimDataEntryResponse({
        formState: getDefaultDSODataEntryState().formState,
        results: {},
        model: "DSOFirstSession",
      });
      renderForm();

      await screen.findByTestId("checks_and_corrections_form");
      overrideOnce("post", "/api/data_entries/1/1", 200, {
        validation_results: { errors: [validationResultMockData.F132], warnings: [] },
      });

      const submitButton = await screen.findByRole("button", { name: "Volgende" });
      await user.click(submitButton);

      const feedbackMessage = [
        "Controleer je antwoorden",
        "F.132",
        "Er is een corrigendum, maar er zijn volgens de antwoorden op het inlegvel 'controles en correcties' geen gecorrigeerde telresultaten.",
        "Overleg met de coördinator.",
      ].join("");

      expect(await screen.findByTestId("feedback-error")).toHaveTextContent(feedbackMessage);
      expect(screen.queryByTestId("feedback-warning")).toBeNull();
    });

    test("F.133 No corrigendum but corrected results", async () => {
      const user = userEvent.setup();
      overrideServerClaimDataEntryResponse({
        formState: getDefaultDSODataEntryState().formState,
        results: {},
        model: "DSOFirstSession",
      });
      renderForm();

      await screen.findByTestId("checks_and_corrections_form");
      overrideOnce("post", "/api/data_entries/1/1", 200, {
        validation_results: { errors: [validationResultMockData.F133], warnings: [] },
      });

      const submitButton = await screen.findByRole("button", { name: "Volgende" });
      await user.click(submitButton);

      const feedbackMessage = [
        "Controleer je antwoorden",
        "F.133",
        "Er is geen corrigendum, maar er zijn volgens de antwoorden op het inlegvel 'controles en correcties' wel gecorrigeerde telresultaten.",
        "Overleg met de coördinator.",
      ].join("");

      expect(await screen.findByTestId("feedback-error")).toHaveTextContent(feedbackMessage);
      expect(screen.queryByTestId("feedback-warning")).toBeNull();
    });

    test("F.134 Multiple answers given on corrected results own initiative", async () => {
      const user = userEvent.setup();
      overrideServerClaimDataEntryResponse({
        formState: getDefaultDSODataEntryState().formState,
        results: {},
        model: "DSOFirstSession",
      });
      renderForm();

      await screen.findByTestId("checks_and_corrections_form");
      overrideOnce("post", "/api/data_entries/1/1", 200, {
        validation_results: { errors: [validationResultMockData.F134], warnings: [] },
      });

      const submitButton = await screen.findByRole("button", { name: "Volgende" });
      await user.click(submitButton);

      const feedbackMessage = [
        "Controleer je antwoorden",
        "F.134",
        "Heb je iets niet goed overgenomen? Herstel de fout en ga verder.",
        "Heb je alles gecontroleerd en komt je invoer overeen met het papier? Ga dan verder.",
      ].join("");

      expect(await screen.findByTestId("feedback-error")).toHaveTextContent(feedbackMessage);
      expect(screen.queryByTestId("feedback-warning")).toBeNull();
    });

    test("F.135 Answers given on corrected results csb request", async () => {
      const user = userEvent.setup();
      overrideServerClaimDataEntryResponse({
        formState: getDefaultDSODataEntryState().formState,
        results: {},
        model: "DSOFirstSession",
      });
      renderForm();

      await screen.findByTestId("checks_and_corrections_form");
      overrideOnce("post", "/api/data_entries/1/1", 200, {
        validation_results: { errors: [validationResultMockData.F135], warnings: [] },
      });

      const submitButton = await screen.findByRole("button", { name: "Volgende" });
      await user.click(submitButton);

      const feedbackMessage = [
        "Controleer je antwoorden",
        "F.135",
        "Heb je iets niet goed overgenomen? Herstel de fout en ga verder.",
        "Heb je alles gecontroleerd en komt je invoer overeen met het papier? Ga dan verder.",
      ].join("");

      expect(await screen.findByTestId("feedback-error")).toHaveTextContent(feedbackMessage);
      expect(screen.queryByTestId("feedback-warning")).toBeNull();
    });
  });
});
