import { userEvent } from "@testing-library/user-event";
import { describe, expect, test } from "vitest";

import { PollingStationChoiceForm } from "app/component/form/data_entry/polling_station_choice/PollingStationChoiceForm";
import { overrideOnce, render, screen, within } from "app/test/unit";

import { ElectionProvider, ElectionStatusProvider } from "@kiesraad/api";
import { electionDetailsMockResponse, electionStatusMockResponse } from "@kiesraad/api-mocks";

function renderPollingStationChoicePage() {
  render(
    <ElectionProvider electionId={1}>
      <ElectionStatusProvider electionId={1}>
        <PollingStationChoiceForm />
      </ElectionStatusProvider>
    </ElectionProvider>,
  );
}

describe("Test PollingStationChoiceForm", () => {
  describe("Polling station data entry form", () => {
    test("Form field entry", async () => {
      overrideOnce("get", "/api/elections/1", 200, electionDetailsMockResponse);
      const user = userEvent.setup();

      renderPollingStationChoicePage();

      expect(await screen.findByRole("heading", { level: 2, name: "Welk stembureau ga je invoeren?" }));
      const pollingStation = screen.getByTestId("pollingStation");

      // Test if the feedback field shows an error
      await user.type(pollingStation, "abc");
      const pollingStationFeedback = await screen.findByTestId("pollingStationSelectorFeedback");
      expect(await within(pollingStationFeedback).findByText("Geen stembureau gevonden met nummer abc")).toBeVisible();

      await user.clear(pollingStation);

      // Test if maxLength on field works
      await user.type(pollingStation, "1234567");
      expect(pollingStation).toHaveValue("123456");

      await user.clear(pollingStation);
    });

    test("Selecting a valid polling station", async () => {
      overrideOnce("get", "/api/elections/1", 200, electionDetailsMockResponse);
      const user = userEvent.setup();
      render(
        <ElectionProvider electionId={1}>
          <ElectionStatusProvider electionId={1}>
            <PollingStationChoiceForm anotherEntry />
          </ElectionStatusProvider>
        </ElectionProvider>,
      );
      expect(await screen.findByRole("heading", { level: 2, name: "Verder met een volgend stembureau?" }));
      const pollingStation = screen.getByTestId("pollingStation");

      // Test if the polling station name is shown
      await user.type(pollingStation, "33");
      const pollingStationFeedback = await screen.findByTestId("pollingStationSelectorFeedback");
      expect(await within(pollingStationFeedback).findByText("Op Rolletjes")).toBeVisible();
    });

    test("Selecting a valid polling station with leading zeros", async () => {
      overrideOnce("get", "/api/elections/1", 200, electionDetailsMockResponse);
      const user = userEvent.setup();
      renderPollingStationChoicePage();

      const pollingStation = await screen.findByTestId("pollingStation");

      // Test if the polling station name is shown
      await user.type(pollingStation, "0034");
      const pollingStationFeedback = await screen.findByTestId("pollingStationSelectorFeedback");
      expect(await within(pollingStationFeedback).findByText("Testplek")).toBeVisible();
    });

    test("Selecting a non-existing polling station", async () => {
      overrideOnce("get", "/api/elections/1", 200, electionDetailsMockResponse);
      const user = userEvent.setup();
      renderPollingStationChoicePage();

      const pollingStation = await screen.findByTestId("pollingStation");

      // Test if the error message is shown correctly without leading zeroes
      await user.type(pollingStation, "0099");
      const pollingStationFeedback = await screen.findByTestId("pollingStationSelectorFeedback");
      expect(await within(pollingStationFeedback).findByText("Geen stembureau gevonden met nummer 99")).toBeVisible();

      await user.clear(pollingStation);

      // Test if the error message is shown correctly when just entering number 0
      await user.type(pollingStation, "0");
      const pollingStationFeedback2 = await screen.findByTestId("pollingStationSelectorFeedback");
      expect(await within(pollingStationFeedback2).findByText("Geen stembureau gevonden met nummer 0")).toBeVisible();
    });

    test("Submitting an empty or invalid polling station shows alert", async () => {
      overrideOnce("get", "/api/elections/1", 200, electionDetailsMockResponse);
      const user = userEvent.setup();
      renderPollingStationChoicePage();

      const pollingStation = await screen.findByTestId("pollingStation");
      const submitButton = screen.getByRole("button", { name: "Beginnen" });

      await user.click(submitButton);

      // Test that an alert is visible
      const pollingStationSubmitFeedback = await screen.findByTestId("pollingStationSubmitFeedback");
      expect(
        within(pollingStationSubmitFeedback).getByText("Voer een geldig nummer van een stembureau in om te beginnen"),
      ).toBeVisible();

      // Now start typing an invalid polling station number
      await user.type(pollingStation, "abc");

      // Test that the alert disappeared
      expect(pollingStationSubmitFeedback).not.toBeVisible();

      // Click submit again and see that the alert appeared again
      await user.click(submitButton);

      expect(
        within(screen.getByTestId("pollingStationSubmitFeedback")).getByText(
          "Voer een geldig nummer van een stembureau in om te beginnen",
        ),
      ).toBeVisible();
    });

    test("Selecting a valid, but finalised polling station shows alert", async () => {
      overrideOnce("get", "/api/elections/1", 200, electionDetailsMockResponse);
      overrideOnce("get", "/api/elections/1/status", 200, electionStatusMockResponse);
      const user = userEvent.setup();
      render(
        <ElectionProvider electionId={1}>
          <ElectionStatusProvider electionId={1}>
            <PollingStationChoiceForm anotherEntry />
          </ElectionStatusProvider>
        </ElectionProvider>,
      );

      const submitButton = await screen.findByRole("button", { name: "Beginnen" });
      const pollingStation = screen.getByTestId("pollingStation");

      // Test if the polling station name is shown
      await user.type(pollingStation, "34");

      // Click submit again and see that the alert appeared again
      await user.click(submitButton);

      expect(
        within(screen.getByTestId("pollingStationSubmitFeedback")).getByText(
          "Het stembureau dat je geselecteerd hebt kan niet meer ingevoerd worden",
        ),
      ).toBeVisible();
    });

    test("Form displays message when searching", async () => {
      overrideOnce("get", "/api/elections/1", 200, electionDetailsMockResponse);
      const user = userEvent.setup();
      renderPollingStationChoicePage();

      const pollingStation = await screen.findByTestId("pollingStation");

      await user.type(pollingStation, "33");
      const pollingStationSearching = await screen.findByTestId("pollingStationSelectorFeedback");
      expect(within(pollingStationSearching).getByText("aan het zoeken …")).toBeVisible();
    });
  });

  describe("Polling station list", () => {
    test("Display polling station list", async () => {
      overrideOnce("get", "/api/elections/1", 200, electionDetailsMockResponse);
      overrideOnce("get", "/api/elections/1/status", 200, electionStatusMockResponse);

      const user = userEvent.setup();
      renderPollingStationChoicePage();

      expect(await screen.findByText("Kies het stembureau")).not.toBeVisible();
      const openPollingStationList = screen.getByTestId("openPollingStationList");
      await user.click(openPollingStationList);

      expect(screen.getByText("Kies het stembureau")).toBeVisible();

      // Check if the station number and name exist and are visible
      const pollingStationList = screen.getByTestId("polling_station_list");
      expect(within(pollingStationList).getByText("33")).toBeVisible();
      expect(within(pollingStationList).getByText("Op Rolletjes")).toBeVisible();

      // These should not exist, as they are finalised
      expect(within(pollingStationList).queryByText("34")).toBe(null);
      expect(within(pollingStationList).queryByText("Testplek")).toBe(null);
    });

    test("Polling station list no stations", async () => {
      overrideOnce("get", "/api/elections/1", 200, { ...electionDetailsMockResponse, polling_stations: [] });
      const user = userEvent.setup();
      renderPollingStationChoicePage();

      const openPollingStationList = await screen.findByTestId("openPollingStationList");
      await user.click(openPollingStationList);
      expect(screen.getByText("Kies het stembureau")).toBeVisible();

      // Check if the error message is visible
      expect(screen.getByText("Geen stembureaus gevonden")).toBeVisible();
    });
  });
});
