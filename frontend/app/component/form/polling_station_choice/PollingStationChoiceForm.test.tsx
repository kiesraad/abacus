import { userEvent } from "@testing-library/user-event";
import { describe, expect, test } from "vitest";

import { PollingStationChoiceForm } from "app/component/form/polling_station_choice/PollingStationChoiceForm.tsx";
import { render, screen } from "app/test/unit";

describe("Test PollingStationChoiceForm", () => {
  test("Form field entry and buttons", async () => {
    const user = userEvent.setup();

    render(<PollingStationChoiceForm />);

    const pollingStation = screen.getByTestId("pollingStation");
    const submitButton = screen.getByRole("button", { name: "Beginnen" });

    // Test if pattern on field works
    await user.type(pollingStation, "abc");
    await user.click(submitButton);
    expect(pollingStation).toBeInvalid();
    await user.clear(pollingStation);

    // Test if maxLength on field works
    await user.type(pollingStation, "1234567");
    expect(pollingStation).toHaveValue("123456");

    expect(screen.getByText("Kies het stembureau")).not.toBeVisible();

    const openPollingStationList = screen.getByTestId("openPollingStationList");
    await user.click(openPollingStationList);

    expect(screen.getByText("Kies het stembureau")).toBeVisible();

    await user.click(submitButton);
  });
});
