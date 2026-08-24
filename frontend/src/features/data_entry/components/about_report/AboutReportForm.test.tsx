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
import {
  getDefaultDataEntryState,
  getDefaultDSODataEntryState,
  getEmptyDSODataEntryRequest,
} from "../../testing/mock-data";
import { overrideServerClaimDataEntryResponse } from "../../testing/test.utils";
import { DataEntryProvider } from "../DataEntryProvider";
import { DataEntrySection } from "../DataEntrySection";

function renderForm() {
  vi.spyOn(ReactRouter, "useParams").mockReturnValue({ sectionId: "about_report" });

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

describe("Test AboutReportForm", () => {
  beforeEach(() => {
    vi.spyOn(useUser, "useUser").mockReturnValue(getTypistUser());
    server.use(DataEntryClaimHandler, DataEntrySaveHandler);
  });

  describe("AboutReportForm user interactions", () => {
    test("hitting enter key does not result in api call", async () => {
      const user = userEvent.setup();

      overrideServerClaimDataEntryResponse({
        formState: getDefaultDataEntryState().formState,
        results: {},
        model: "DSOFirstSession",
      });
      renderForm();

      const twoDocuments = await screen.findByRole("radio", {
        name: /^Ja, ik heb twee documenten \(een proces-verbaal en een corrigendum\)/,
      });
      await user.click(twoDocuments);
      expect(twoDocuments).toBeChecked();

      const spy = vi.spyOn(global, "fetch");

      await user.keyboard("{enter}");

      expect(spy).not.toHaveBeenCalled();
    });

    test("hitting shift+enter does result in api call", async () => {
      const user = userEvent.setup();
      overrideServerClaimDataEntryResponse({
        formState: getDefaultDataEntryState().formState,
        results: {},
        model: "DSOFirstSession",
      });

      renderForm();
      const spy = vi.spyOn(global, "fetch");

      const twoDocuments = await screen.findByRole("radio", {
        name: /^Ja, ik heb twee documenten \(een proces-verbaal en een corrigendum\)/,
      });
      await user.click(twoDocuments);
      expect(twoDocuments).toBeChecked();

      await user.keyboard("{shift>}{enter}{/shift}");

      expect(spy).toHaveBeenCalled();
    });

    test("Form field entry and keybindings", async () => {
      overrideOnce("post", "/api/data_entries/1/1", 200, {
        validation_results: { errors: [], warnings: [] },
      });

      const user = userEvent.setup();
      overrideServerClaimDataEntryResponse({
        formState: getDefaultDataEntryState().formState,
        results: {},
        model: "DSOFirstSession",
      });
      renderForm();

      await user.keyboard("{tab}");

      const twoDocuments = await screen.findByRole("radio", {
        name: /^Ja, ik heb twee documenten \(een proces-verbaal en een corrigendum\)/,
      });
      const oneDocument = await screen.findByRole("radio", {
        name: /^Nee, ik heb één document \(alleen een proces-verbaal\)/,
      });
      expect(twoDocuments).toHaveFocus();
      expect(twoDocuments).not.toBeChecked();
      expect(oneDocument).not.toHaveFocus();
      expect(oneDocument).not.toBeChecked();
      await user.keyboard("{ArrowDown}");
      expect(oneDocument).toHaveFocus();
      expect(oneDocument).toBeChecked();
      expect(twoDocuments).not.toHaveFocus();
      expect(twoDocuments).not.toBeChecked();
      await user.keyboard("{ArrowUp}");
      expect(twoDocuments).toHaveFocus();
      expect(twoDocuments).toBeChecked();
      expect(oneDocument).not.toHaveFocus();
      expect(oneDocument).not.toBeChecked();

      // TODO: Change to using enter in issue #3864
      await user.keyboard("{tab}");

      const pagePresent = await screen.findByRole("radio", {
        name: "Ja, de pagina ‘controles en correcties’ is aanwezig",
      });
      const pageMissing = await screen.findByRole("radio", {
        name: "Nee, de pagina ontbreekt",
      });
      expect(pagePresent).toHaveFocus();
      expect(pagePresent).not.toBeChecked();
      expect(pageMissing).not.toHaveFocus();
      expect(pageMissing).not.toBeChecked();
      await user.keyboard("{ArrowDown}");
      expect(pageMissing).toHaveFocus();
      expect(pageMissing).toBeChecked();
      expect(pagePresent).not.toHaveFocus();
      expect(pagePresent).not.toBeChecked();
      await user.keyboard("{ArrowUp}");
      expect(pagePresent).toHaveFocus();
      expect(pagePresent).toBeChecked();
      expect(pageMissing).not.toHaveFocus();
      expect(pageMissing).not.toBeChecked();

      await user.keyboard("{enter}");

      const submitButton = screen.getByRole("button", { name: "Volgende" });
      await user.click(submitButton);
    });
  });

  describe("AboutReportForm API request and response", () => {
    test("AboutReportForm request body is equal to the form data", async () => {
      const expectedRequest = {
        data: {
          ...getEmptyDSODataEntryRequest().data,
          about_report: {
            corrigendum_present: "TwoDocuments",
            checks_and_corrections_present: "PagePresent",
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

      await screen.findByTestId("about_report_form");
      const spy = vi.spyOn(global, "fetch");

      const twoDocuments = await screen.findByRole("radio", {
        name: /^Ja, ik heb twee documenten \(een proces-verbaal en een corrigendum\)/,
      });
      await user.click(twoDocuments);
      expect(twoDocuments).toBeChecked();

      const pagePresent = await screen.findByRole("radio", {
        name: "Ja, de pagina ‘controles en correcties’ is aanwezig",
      });
      await user.click(pagePresent);
      expect(pagePresent).toBeChecked();

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

  describe("AboutReportForm errors", () => {
    test("F.121 Radio's not checked", async () => {
      const user = userEvent.setup();

      overrideServerClaimDataEntryResponse({
        formState: getDefaultDataEntryState().formState,
        results: {},
        model: "DSOFirstSession",
      });
      renderForm();

      await screen.findByTestId("about_report_form");
      overrideOnce("post", "/api/data_entries/1/1", 200, {
        validation_results: { errors: [validationResultMockData.F121], warnings: [] },
      });

      const submitButton = await screen.findByRole("button", { name: "Volgende" });
      await user.click(submitButton);

      const feedbackMessage = [
        "Controleer je antwoorden",
        "F.121",
        "Beantwoord de vragen over het papieren proces-verbaal.",
        "Overleg met de coördinator als je twijfelt.",
      ].join("");

      expect(await screen.findByTestId("feedback-error")).toHaveTextContent(feedbackMessage);
      expect(screen.queryByTestId("feedback-warning")).toBeNull();
    });

    test("F.122 TwoDocuments but PageMissing", async () => {
      const user = userEvent.setup();
      overrideServerClaimDataEntryResponse({
        formState: getDefaultDataEntryState().formState,
        results: {},
        model: "DSOFirstSession",
      });
      renderForm();

      await screen.findByTestId("about_report_form");
      overrideOnce("post", "/api/data_entries/1/1", 200, {
        validation_results: { errors: [validationResultMockData.F122], warnings: [] },
      });

      const submitButton = await screen.findByRole("button", { name: "Volgende" });
      await user.click(submitButton);

      const feedbackMessage = [
        "Het inlegvel ontbreekt, maar hoort wel aanwezig te zijn",
        "F.122",
        "Overleg met de coördinator over het ontbrekende inlegvel.",
      ].join("");

      expect(await screen.findByTestId("feedback-error")).toHaveTextContent(feedbackMessage);
      expect(screen.queryByTestId("feedback-warning")).toBeNull();
    });
  });
});
