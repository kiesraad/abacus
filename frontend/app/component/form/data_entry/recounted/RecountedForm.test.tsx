import { userEvent } from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { POLLING_STATION_DATA_ENTRY_SAVE_REQUEST_BODY, SaveDataEntryResponse } from "@kiesraad/api";
import {
  electionMockData,
  PollingStationDataEntryGetHandler,
  PollingStationDataEntrySaveHandler,
} from "@kiesraad/api-mocks";
import { getUrlMethodAndBody, overrideOnce, render, screen, server } from "@kiesraad/test";

import { DataEntryProvider } from "../state/DataEntryProvider";
import { errorWarningMocks, getEmptyDataEntryRequest } from "../test-data";
import { RecountedForm } from "./RecountedForm";

const Component = (
  <DataEntryProvider election={electionMockData} pollingStationId={1} entryNumber={1}>
    <RecountedForm />
  </DataEntryProvider>
);

describe("Test RecountedForm", () => {
  beforeEach(() => {
    server.use(PollingStationDataEntryGetHandler, PollingStationDataEntrySaveHandler);
  });
  describe("RecountedForm user interactions", () => {
    test("hitting enter key does not result in api call", async () => {
      render(Component);

      const user = userEvent.setup();

      const yes = await screen.findByTestId("yes");
      await user.click(yes);
      expect(yes).toBeChecked();

      const spy = vi.spyOn(global, "fetch");

      await user.keyboard("{enter}");

      expect(spy).not.toHaveBeenCalled();
    });

    test("hitting shift+enter does result in api call", async () => {
      render(Component);

      const user = userEvent.setup();
      const spy = vi.spyOn(global, "fetch");

      const yes = await screen.findByTestId("yes");
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

      render(Component);

      const yes = await screen.findByTestId("yes");
      const no = await screen.findByTestId("no");
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

      render(Component);

      const user = userEvent.setup();

      const yes = await screen.findByTestId("yes");
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

      render(Component);

      const yes = await screen.findByTestId("yes");
      const no = await screen.findByTestId("no");
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
});
