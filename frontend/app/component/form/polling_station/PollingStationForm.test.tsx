import { userEvent } from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";

import { render, screen, userTypeInputs } from "app/test/unit";

import { PollingStation } from "@kiesraad/api";

import { PollingStationForm } from "./PollingStationForm";

describe("PollingStationForm create", () => {
  test("PollingStationForm", async () => {
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

    const { id, election_id, ...inputs } = testPollingStation;

    // mainly to stop eslint from complaining about unused variables
    expect(id).toBe(1);
    expect(election_id).toBe(1);

    await userTypeInputs(user, inputs);

    await userEvent.click(screen.getByRole("button", { name: "submit" }));
  });
});
