import { userEvent } from "@testing-library/user-event";
import { describe, expect, test } from "vitest";
import { render, screen, within } from "app/test/unit";
import { PollingStationChoiceForm } from "app/component/form/polling_station_choice/PollingStationChoiceForm.tsx";
import { PollingStationProvider } from "@kiesraad/api";

describe("Test PollingStationChoiceForm", () => {
  test("Form field entry", async () => {
    const user = userEvent.setup();

    render(
      <PollingStationProvider electionId={1}>
        <PollingStationChoiceForm />
      </PollingStationProvider>,
    );

    const pollingStation = screen.getByTestId("pollingStation");

    // Test if the feedback field shows an error
    await user.type(pollingStation, "abc");
    const pollingStationFeedback = screen.getByTestId("pollingStationSelectorFeedback");
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
    const user = userEvent.setup();
    render(
      <PollingStationProvider electionId={1}>
        <PollingStationChoiceForm />
      </PollingStationProvider>,
    );
    const pollingStation = screen.getByTestId("pollingStation");

    // Test if the polling station name is shown
    await user.type(pollingStation, "20");
    const pollingStationFeedback = screen.getByTestId("pollingStationSelectorFeedback");
    expect(within(pollingStationFeedback).getByText('Stembureau "Op Rolletjes"')).toBeVisible();
  });

  test("Selecting a non-existing polling station", async () => {
    const user = userEvent.setup();
    render(
      <PollingStationProvider electionId={1}>
        <PollingStationChoiceForm />
      </PollingStationProvider>,
    );
    const pollingStation = screen.getByTestId("pollingStation");

    // Test if the polling station name is shown
    await user.type(pollingStation, "99");
    const pollingStationFeedback = screen.getByTestId("pollingStationSelectorFeedback");
    expect(
      within(pollingStationFeedback).getByText("Geen stembureau gevonden met nummer 99"),
    ).toBeVisible();
  });

  test("Polling station list", async () => {
    const user = userEvent.setup();

    render(
      <PollingStationProvider electionId={1}>
        <PollingStationChoiceForm />
      </PollingStationProvider>,
    );

    expect(screen.getByText("Kies het stembureau")).not.toBeVisible();
    const openPollingStationList = screen.getByTestId("openPollingStationList");
    await user.click(openPollingStationList);

    expect(screen.getByText("Kies het stembureau")).toBeVisible();

    // Check if the station number and name exist and are visible
    const pollingStationList = screen.getByTestId("polling_station_list");
    expect(within(pollingStationList).getByText("20")).toBeVisible();
    expect(within(pollingStationList).getByText('Stembureau "Op Rolletjes"')).toBeVisible();
    expect(within(pollingStationList).getByText("21")).toBeVisible();
    expect(within(pollingStationList).getByText("Testplek")).toBeVisible();
  });
});
