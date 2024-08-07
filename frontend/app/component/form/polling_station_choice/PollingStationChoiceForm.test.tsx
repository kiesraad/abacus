import { userEvent } from "@testing-library/user-event";
import { describe, expect, test } from "vitest";

import { PollingStationChoiceForm } from "app/component/form/polling_station_choice/PollingStationChoiceForm";
import { overrideOnce, render, screen, within } from "app/test/unit";

import { PollingStationListProvider } from "@kiesraad/api";
import { pollingStationsMockResponse } from "@kiesraad/api-mocks";

describe("Test PollingStationChoiceForm", () => {
  test("Form field entry", async () => {
    overrideOnce("get", "/api/elections/1/polling_stations", 200, pollingStationsMockResponse);
    const user = userEvent.setup();

    render(
      <PollingStationListProvider electionId={1}>
        <PollingStationChoiceForm />
      </PollingStationListProvider>,
    );

    const pollingStation = screen.getByTestId("pollingStation");

    // Test if the feedback field shows an error
    await user.type(pollingStation, "abc");
    const pollingStationFeedback = await screen.findByTestId("pollingStationSelectorFeedback");
    expect(
      within(pollingStationFeedback).getByText("Geen stembureau gevonden met nummer abc"),
    ).toBeVisible();

    await user.clear(pollingStation);

    // Test if maxLength on field works
    await user.type(pollingStation, "1234567");
    expect(pollingStation).toHaveValue("123456");

    await user.clear(pollingStation);
  });

  test("Selecting a valid polling station", async () => {
    overrideOnce("get", "/api/elections/1/polling_stations", 200, pollingStationsMockResponse);
    const user = userEvent.setup();
    render(
      <PollingStationListProvider electionId={1}>
        <PollingStationChoiceForm />
      </PollingStationListProvider>,
    );
    const pollingStation = screen.getByTestId("pollingStation");

    // Test if the polling station name is shown
    await user.type(pollingStation, "33");
    const pollingStationFeedback = await screen.findByTestId("pollingStationSelectorFeedback");
    expect(within(pollingStationFeedback).getByText('Stembureau "Op Rolletjes"')).toBeVisible();
  });

  test("Selecting a non-existing polling station", async () => {
    overrideOnce("get", "/api/elections/1/polling_stations", 200, pollingStationsMockResponse);
    const user = userEvent.setup();
    render(
      <PollingStationListProvider electionId={1}>
        <PollingStationChoiceForm />
      </PollingStationListProvider>,
    );
    const pollingStation = screen.getByTestId("pollingStation");

    // Test if the polling station name is shown
    await user.type(pollingStation, "99");
    const pollingStationFeedback = await screen.findByTestId("pollingStationSelectorFeedback");
    expect(
      within(pollingStationFeedback).getByText("Geen stembureau gevonden met nummer 99"),
    ).toBeVisible();
  });

  test("Polling station list", async () => {
    overrideOnce("get", "/api/elections/1/polling_stations", 200, pollingStationsMockResponse);
    const user = userEvent.setup();

    render(
      <PollingStationListProvider electionId={1}>
        <PollingStationChoiceForm />
      </PollingStationListProvider>,
    );

    expect(screen.getByText("Kies het stembureau")).not.toBeVisible();
    const openPollingStationList = screen.getByTestId("openPollingStationList");
    await user.click(openPollingStationList);

    expect(screen.getByText("Kies het stembureau")).toBeVisible();

    // Check if the station number and name exist and are visible
    const pollingStationList = screen.getByTestId("polling_station_list");
    expect(within(pollingStationList).getByText("33")).toBeVisible();
    expect(within(pollingStationList).getByText('Stembureau "Op Rolletjes"')).toBeVisible();
    expect(within(pollingStationList).getByText("34")).toBeVisible();
    expect(within(pollingStationList).getByText("Testplek")).toBeVisible();
  });

  test("Polling station list no stations", async () => {
    overrideOnce("get", "/api/elections/1/polling_stations", 200, {
      polling_stations: [],
    });
    const user = userEvent.setup();

    render(
      <PollingStationListProvider electionId={1}>
        <PollingStationChoiceForm />
      </PollingStationListProvider>,
    );

    const openPollingStationList = screen.getByTestId("openPollingStationList");
    await user.click(openPollingStationList);
    expect(screen.getByText("Kies het stembureau")).toBeVisible();

    // Check if the error message is visible
    expect(screen.getByText("Geen stembureaus gevonden")).toBeVisible();
  });

  test("Polling station request returns 404", async () => {
    overrideOnce("get", "/api/elections/1/polling_stations", 404, {
      error: "Resource not found",
    });
    const user = userEvent.setup();

    render(
      <PollingStationListProvider electionId={1}>
        <PollingStationChoiceForm />
      </PollingStationListProvider>,
    );

    const openPollingStationList = screen.getByTestId("openPollingStationList");
    await user.click(openPollingStationList);
    expect(screen.getByText("Kies het stembureau")).toBeVisible();

    // Check if the error message is visible
    expect(screen.getByText("Geen stembureaus gevonden")).toBeVisible();
  });

  test("Submitting an empty or invalid polling station shows alert", async () => {
    const user = userEvent.setup();
    render(
      <PollingStationListProvider electionId={1}>
        <PollingStationChoiceForm />
      </PollingStationListProvider>,
    );

    const pollingStation = screen.getByTestId("pollingStation");
    const submitButton = screen.getByRole("button", { name: "Beginnen" });

    await user.click(submitButton);

    // Test that an alert is visible
    const pollingStationSubmitFeedback = await screen.findByTestId("pollingStationSubmitFeedback");
    expect(
      within(pollingStationSubmitFeedback).getByText(
        "Voer een geldig nummer van een stembureau in om te beginnen",
      ),
    ).toBeVisible();

    // Now start typing an invalid polling station number
    await user.type(pollingStation, "abc");

    // Test that the alert disappeared
    expect(screen.queryByTestId("pollingStationSubmitFeedback")).toBeNull();

    // Click submit again and see that the alert appeared again
    await user.click(submitButton);

    expect(
      within(screen.getByTestId("pollingStationSubmitFeedback")).getByText(
        "Voer een geldig nummer van een stembureau in om te beginnen",
      ),
    ).toBeVisible();
  });
});
