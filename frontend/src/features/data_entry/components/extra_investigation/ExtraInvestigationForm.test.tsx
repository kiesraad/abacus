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
import { getUrlMethodAndBody, render, screen, within } from "@/testing/test-utils";
import { getTypistUser } from "@/testing/user-mock-data";
import type { DATA_ENTRY_SAVE_REQUEST_BODY } from "@/types/generated/openapi";
import { getDefaultDataEntryState, getEmptyDataEntryRequest } from "../../testing/mock-data";
import { overrideServerClaimDataEntryResponse } from "../../testing/test.utils";
import { DataEntryProvider } from "../DataEntryProvider";
import { DataEntrySection } from "../DataEntrySection";

function renderForm() {
  vi.spyOn(ReactRouter, "useParams").mockReturnValue({ sectionId: "extra_investigation" });

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

describe("Test ExtraInvestigationForm", () => {
  beforeEach(() => {
    vi.spyOn(useUser, "useUser").mockReturnValue(getTypistUser());
    server.use(DataEntryClaimHandler, DataEntrySaveHandler);
  });

  describe("ExtraInvestigationForm user interactions", () => {
    test("hitting enter key does not result in api call", async () => {
      const user = userEvent.setup();

      overrideServerClaimDataEntryResponse({
        formState: getDefaultDataEntryState().formState,
        results: {},
      });
      renderForm();

      const extraInvestigationOtherReason = await screen.findByRole("group", {
        name: "Heeft het gemeentelijk stembureau extra onderzoek gedaan vanwege een andere reden dan een onverklaard verschil?",
      });
      const extraInvestigationOtherReasonYes = within(extraInvestigationOtherReason).getByRole("checkbox", {
        name: "Ja",
      });
      await user.click(extraInvestigationOtherReasonYes);
      expect(extraInvestigationOtherReasonYes).toBeChecked();

      const spy = vi.spyOn(global, "fetch");

      await user.keyboard("{enter}");

      expect(spy).not.toHaveBeenCalled();
    });

    test("hitting shift+enter does result in api call", async () => {
      const user = userEvent.setup();
      overrideServerClaimDataEntryResponse({
        formState: getDefaultDataEntryState().formState,
        results: {},
      });

      renderForm();
      const spy = vi.spyOn(global, "fetch");

      const extraInvestigationOtherReason = await screen.findByRole("group", {
        name: "Heeft het gemeentelijk stembureau extra onderzoek gedaan vanwege een andere reden dan een onverklaard verschil?",
      });
      const extraInvestigationOtherReasonYes = within(extraInvestigationOtherReason).getByRole("checkbox", {
        name: "Ja",
      });
      await user.click(extraInvestigationOtherReasonYes);
      expect(extraInvestigationOtherReasonYes).toBeChecked();

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
      });
      renderForm();

      const extraInvestigationOtherReason = await screen.findByRole("group", {
        name: "Heeft het gemeentelijk stembureau extra onderzoek gedaan vanwege een andere reden dan een onverklaard verschil?",
      });
      const extraInvestigationOtherReasonYes = within(extraInvestigationOtherReason).getByRole("checkbox", {
        name: "Ja",
      });
      expect(extraInvestigationOtherReasonYes).toHaveFocus();
      await user.keyboard(" ");
      expect(extraInvestigationOtherReasonYes).toBeChecked();

      await user.keyboard("{enter}");
      await user.keyboard("{enter}");

      const ballotsRecounted = await screen.findByRole("group", {
        name: "Zijn de stembiljetten naar aanleiding van het extra onderzoek (gedeeltelijk) herteld?",
      });
      const ballotsRecountedYes = within(ballotsRecounted).getByRole("checkbox", {
        name: "Ja",
      });
      expect(ballotsRecountedYes).toHaveFocus();
      await user.keyboard(" ");
      expect(ballotsRecountedYes).toBeChecked();

      await user.keyboard("{enter}");
      await user.keyboard("{enter}");

      const submitButton = screen.getByRole("button", { name: "Volgende" });
      await user.click(submitButton);
    });
  });

  describe("ExtraInvestigationForm API request and response", () => {
    test("ExtraInvestigationForm request body is equal to the form data", async () => {
      const expectedRequest = {
        data: {
          ...getEmptyDataEntryRequest().data,
          extra_investigation: {
            extra_investigation_other_reason: {
              yes: true,
              no: false,
            },
            ballots_recounted_extra_investigation: {
              yes: true,
              no: false,
            },
          },
        },
        client_state: {},
      };

      const user = userEvent.setup();
      overrideServerClaimDataEntryResponse({
        formState: getDefaultDataEntryState().formState,
        results: {},
      });

      renderForm();

      await screen.findByTestId("extra_investigation_form");
      const spy = vi.spyOn(global, "fetch");

      const extraInvestigationOtherReason = await screen.findByRole("group", {
        name: "Heeft het gemeentelijk stembureau extra onderzoek gedaan vanwege een andere reden dan een onverklaard verschil?",
      });
      const extraInvestigationOtherReasonYes = within(extraInvestigationOtherReason).getByRole("checkbox", {
        name: "Ja",
      });
      await user.click(extraInvestigationOtherReasonYes);
      expect(extraInvestigationOtherReasonYes).toBeChecked();

      const ballotsRecounted = await screen.findByRole("group", {
        name: "Zijn de stembiljetten naar aanleiding van het extra onderzoek (gedeeltelijk) herteld?",
      });
      const ballotsRecountedYes = within(ballotsRecounted).getByRole("checkbox", {
        name: "Ja",
      });
      await user.click(ballotsRecountedYes);
      expect(ballotsRecountedYes).toBeChecked();

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

  describe("ExtraInvestigationForm errors", () => {
    test("F.101 Both questions need to be answered or unanswered", async () => {
      const user = userEvent.setup();

      overrideServerClaimDataEntryResponse({
        formState: getDefaultDataEntryState().formState,
        results: {},
      });
      renderForm();

      await screen.findByTestId("extra_investigation_form");
      overrideOnce("post", "/api/data_entries/1/1", 200, {
        validation_results: { errors: [validationResultMockData.F101], warnings: [] },
      });

      const submitButton = await screen.findByRole("button", { name: "Volgende" });
      await user.click(submitButton);

      const feedbackMessage = [
        "Controleer je antwoorden",
        "F.101",
        "Heb je iets niet goed overgenomen? Herstel de fout en ga verder.",
        "Heb je alles gecontroleerd en komt je invoer overeen met het papier? Ga dan verder.",
      ].join("");

      expect(await screen.findByTestId("feedback-error")).toHaveTextContent(feedbackMessage);
      expect(screen.queryByTestId("feedback-warning")).toBeNull();
    });

    test("F.102 Only one answer per question is allowed", async () => {
      const user = userEvent.setup();
      overrideServerClaimDataEntryResponse({
        formState: getDefaultDataEntryState().formState,
        results: {},
      });
      renderForm();

      await screen.findByTestId("extra_investigation_form");
      overrideOnce("post", "/api/data_entries/1/1", 200, {
        validation_results: { errors: [validationResultMockData.F102], warnings: [] },
      });

      const submitButton = await screen.findByRole("button", { name: "Volgende" });
      await user.click(submitButton);

      const feedbackMessage = [
        "Controleer je antwoorden",
        "F.102",
        "Heb je iets niet goed overgenomen? Herstel de fout en ga verder.",
        "Heb je alles gecontroleerd en komt je invoer overeen met het papier? Ga dan verder.",
      ].join("");

      expect(await screen.findByTestId("feedback-error")).toHaveTextContent(feedbackMessage);
      expect(screen.queryByTestId("feedback-warning")).toBeNull();
    });
  });
});
