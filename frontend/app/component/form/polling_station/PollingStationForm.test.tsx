import { userEvent } from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";

import { render, screen, userTypeInputs, waitFor } from "app/test/unit";

import { PollingStation } from "@kiesraad/api";
import { t } from "@kiesraad/i18n";

import { PollingStationForm } from "./PollingStationForm";

describe("PollingStationForm create", () => {
  test("PollingStationForm create", async () => {
    const testPollingStation: PollingStation = {
      id: 1,
      election_id: 1,
      number: 1,
      name: "test",
      street: "test",
      postal_code: "1234",
      locality: "test",
      polling_station_type: "FixedLocation",
      number_of_voters: 1,
      house_number: "test",
    };

    const onSaved = vi.fn();

    render(<PollingStationForm electionId={1} onSaved={onSaved} />);

    const user = userEvent.setup();

    const { id, election_id, polling_station_type, ...inputs } = testPollingStation;

    // mainly to stop eslint from complaining about unused variables
    expect(id).toBe(1);
    expect(election_id).toBe(1);

    await userTypeInputs(user, inputs, true);

    const pollingStationType = screen.getByTestId(`polling_station_type-${polling_station_type}`);
    await userEvent.click(pollingStationType);

    await userEvent.click(screen.getByRole("button", { name: t("polling_station.form.save_create") }));
  });
  test("PollingStationForm update", async () => {
    const testPollingStation: PollingStation = {
      id: 1,
      election_id: 1,
      number: 1,
      name: "test",
      street: "test",
      postal_code: "1234",
      locality: "test",
      polling_station_type: "FixedLocation",
      number_of_voters: 1,
      house_number: "test",
    };

    const onSaved = vi.fn();

    render(<PollingStationForm electionId={1} onSaved={onSaved} pollingStation={testPollingStation} />);

    const user = userEvent.setup();

    const input = screen.getByTestId("name");
    await user.clear(input);
    await user.type(input, "test2");

    await userEvent.click(screen.getByRole("button", { name: t("polling_station.form.save_update") }));

    await waitFor(() => {
      expect(onSaved).toHaveBeenCalledWith({ ...testPollingStation, name: "test2" });
    });
  });
});
