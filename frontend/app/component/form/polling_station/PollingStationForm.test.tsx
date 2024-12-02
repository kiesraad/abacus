import { UserEvent, userEvent } from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";

import { render, screen, waitFor } from "app/test/unit";

import { PollingStation } from "@kiesraad/api";

import { PollingStationForm } from "./PollingStationForm";

async function fillForm(user: UserEvent, testPollingStation: PollingStation | Omit<PollingStation, "id">) {
  await user.type(await screen.findByRole("textbox", { name: "Nummer" }), testPollingStation.number.toString());
  await user.type(await screen.findByRole("textbox", { name: "Naam" }), testPollingStation.name.toString());
  await user.type(await screen.findByRole("textbox", { name: "Straatnaam" }), testPollingStation.street.toString());
  await user.type(
    await screen.findByRole("textbox", { name: "Huisnummer" }),
    testPollingStation.house_number.toString(),
  );
  if (testPollingStation.house_number_addition) {
    await user.type(
      await screen.findByRole("textbox", { name: "Toevoeging" }),
      testPollingStation.house_number_addition.toString(),
    );
  }
  await user.type(await screen.findByRole("textbox", { name: "Postcode" }), testPollingStation.postal_code.toString());
  await user.type(await screen.findByRole("textbox", { name: "Plaats" }), testPollingStation.locality.toString());
  await user.type(
    screen.getByRole("textbox", { name: "Aantal kiesgerechtigden Optioneel" }),
    String(testPollingStation.number_of_voters?.toString()),
  );

  const pollingStationType = screen.getByRole("radio", { name: "Vaste locatie" });
  await userEvent.click(pollingStationType);

  await userEvent.click(screen.getByRole("button", { name: "Opslaan en toevoegen" }));
}

describe("PollingStationForm create", () => {
  test("PollingStationForm create", async () => {
    const testPollingStation: Omit<PollingStation, "id"> = {
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
    await fillForm(user, testPollingStation);

    await userEvent.click(screen.getByRole("button", { name: "Opslaan en toevoegen" }));

    await waitFor(() => {
      expect(onSaved).toHaveBeenCalledWith(expect.objectContaining(testPollingStation));
    });
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

    const input = await screen.findByRole("textbox", { name: "Naam" });
    await user.clear(input);
    await user.type(input, "test2");

    await userEvent.click(screen.getByRole("button", { name: "Wijzigingen opslaan" }));

    await waitFor(() => {
      expect(onSaved).toHaveBeenCalled();
    });
  });
});
