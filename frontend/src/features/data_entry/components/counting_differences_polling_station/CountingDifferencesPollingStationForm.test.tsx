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
  vi.spyOn(ReactRouter, "useParams").mockReturnValue({ sectionId: "counting_differences_polling_station" });

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

describe("Test CountingDifferencesPollingStationForm", () => {
  beforeEach(() => {
    vi.spyOn(useUser, "useUser").mockReturnValue(getTypistUser());
    server.use(DataEntryClaimHandler, DataEntrySaveHandler);
  });

  describe("CountingDifferencesPollingStationForm user interactions", () => {
    test("hitting enter key does not result in api call", async () => {
      const user = userEvent.setup();

      overrideServerClaimDataEntryResponse({
        formState: getDefaultDataEntryState().formState,
        results: {},
      });
      renderForm();

      const differenceBallotsVotersCompletelyAccountedFor = await screen.findByRole("group", {
        name: "Is in de telresultaten van het stembureau het verschil tussen het totaal aantal getelde stemmen en het aantal toegelaten kiezers volledig verklaard?",
      });
      const differenceBallotsVotersCompletelyAccountedForYes = within(
        differenceBallotsVotersCompletelyAccountedFor,
      ).getByRole("checkbox", {
        name: "Ja",
      });
      await user.click(differenceBallotsVotersCompletelyAccountedForYes);
      expect(differenceBallotsVotersCompletelyAccountedForYes).toBeChecked();

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

      const differenceBallotsVotersCompletelyAccountedFor = await screen.findByRole("group", {
        name: "Is in de telresultaten van het stembureau het verschil tussen het totaal aantal getelde stemmen en het aantal toegelaten kiezers volledig verklaard?",
      });
      const differenceBallotsVotersCompletelyAccountedForYes = within(
        differenceBallotsVotersCompletelyAccountedFor,
      ).getByRole("checkbox", {
        name: "Ja",
      });
      await user.click(differenceBallotsVotersCompletelyAccountedForYes);
      expect(differenceBallotsVotersCompletelyAccountedForYes).toBeChecked();

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

      const differenceBallotsVotersCompletelyAccountedFor = await screen.findByRole("group", {
        name: "Is in de telresultaten van het stembureau het verschil tussen het totaal aantal getelde stemmen en het aantal toegelaten kiezers volledig verklaard?",
      });
      const differenceBallotsVotersCompletelyAccountedForYes = within(
        differenceBallotsVotersCompletelyAccountedFor,
      ).getByRole("checkbox", {
        name: "Ja",
      });
      expect(differenceBallotsVotersCompletelyAccountedForYes).toHaveFocus();
      await user.keyboard(" ");
      expect(differenceBallotsVotersCompletelyAccountedForYes).toBeChecked();

      await user.keyboard("{enter}");
      await user.keyboard("{enter}");

      const differenceBallotsPerList = await screen.findByRole("group", {
        name: "Is er een verschil tussen het totaal aantal getelde stembiljetten per lijst zoals eerder vastgesteld door het stembureau en zoals door u geteld op het gemeentelijk stembureau?",
      });
      const differenceBallotsPerListYes = within(differenceBallotsPerList).getByRole("checkbox", {
        name: "Ja",
      });
      expect(differenceBallotsPerListYes).toHaveFocus();
      await user.keyboard(" ");
      expect(differenceBallotsPerListYes).toBeChecked();

      await user.keyboard("{enter}");
      await user.keyboard("{enter}");

      const submitButton = screen.getByRole("button", { name: "Volgende" });
      await user.click(submitButton);
    });
  });

  describe("CountingDifferencesPollingStationForm API request and response", () => {
    test("CountingDifferencesPollingStationForm request body is equal to the form data", async () => {
      const expectedRequest = {
        data: {
          ...getEmptyDataEntryRequest().data,
          counting_differences_polling_station: {
            difference_ballots_voters_completely_accounted_for: {
              yes: true,
              no: false,
            },
            difference_ballots_per_list: {
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

      await screen.findByTestId("counting_differences_polling_station_form");
      const spy = vi.spyOn(global, "fetch");

      const differenceBallotsVotersCompletelyAccountedFor = await screen.findByRole("group", {
        name: "Is in de telresultaten van het stembureau het verschil tussen het totaal aantal getelde stemmen en het aantal toegelaten kiezers volledig verklaard?",
      });
      const differenceBallotsVotersCompletelyAccountedForYes = within(
        differenceBallotsVotersCompletelyAccountedFor,
      ).getByRole("checkbox", {
        name: "Ja",
      });
      await user.click(differenceBallotsVotersCompletelyAccountedForYes);
      expect(differenceBallotsVotersCompletelyAccountedForYes).toBeChecked();

      const differenceBallotsPerList = await screen.findByRole("group", {
        name: "Is er een verschil tussen het totaal aantal getelde stembiljetten per lijst zoals eerder vastgesteld door het stembureau en zoals door u geteld op het gemeentelijk stembureau?",
      });
      const differenceBallotsPerListYes = within(differenceBallotsPerList).getByRole("checkbox", {
        name: "Ja",
      });
      await user.click(differenceBallotsPerListYes);
      expect(differenceBallotsPerListYes).toBeChecked();

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

  describe("CountingDifferencesPollingStationForm errors", () => {
    test("F.111 Both questions need to be answered", async () => {
      const user = userEvent.setup();

      overrideServerClaimDataEntryResponse({
        formState: getDefaultDataEntryState().formState,
        results: {},
      });
      renderForm();

      await screen.findByTestId("counting_differences_polling_station_form");
      overrideOnce("post", "/api/data_entries/1/1", 200, {
        validation_results: { errors: [validationResultMockData.F111], warnings: [] },
      });

      const submitButton = await screen.findByRole("button", { name: "Volgende" });
      await user.click(submitButton);

      const feedbackMessage = [
        "Controleer je antwoorden",
        "F.111",
        "Heb je iets niet goed overgenomen? Herstel de fout en ga verder.",
        "Heb je alles gecontroleerd en komt je invoer overeen met het papier? Ga dan verder.",
      ].join("");

      expect(await screen.findByTestId("feedback-error")).toHaveTextContent(feedbackMessage);
      expect(screen.queryByTestId("feedback-warning")).toBeNull();
    });

    test("F.112 Only one answer per question is allowed", async () => {
      const user = userEvent.setup();
      overrideServerClaimDataEntryResponse({
        formState: getDefaultDataEntryState().formState,
        results: {},
      });
      renderForm();

      await screen.findByTestId("counting_differences_polling_station_form");
      overrideOnce("post", "/api/data_entries/1/1", 200, {
        validation_results: { errors: [validationResultMockData.F112], warnings: [] },
      });

      const submitButton = await screen.findByRole("button", { name: "Volgende" });
      await user.click(submitButton);

      const feedbackMessage = [
        "Controleer je antwoorden",
        "F.112",
        "Heb je iets niet goed overgenomen? Herstel de fout en ga verder.",
        "Heb je alles gecontroleerd en komt je invoer overeen met het papier? Ga dan verder.",
      ].join("");

      expect(await screen.findByTestId("feedback-error")).toHaveTextContent(feedbackMessage);
      expect(screen.queryByTestId("feedback-warning")).toBeNull();
    });
  });
});
