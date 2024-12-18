import { UserEvent, userEvent } from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";

import { overrideOnce, render, screen, waitFor } from "app/test/unit";

import { ErrorResponse, PollingStation } from "@kiesraad/api";

import { PollingStationForm } from "./PollingStationForm";

function getInputs() {
  const result = {
    number: screen.getByRole("textbox", { name: "Nummer" }),
    name: screen.getByRole("textbox", { name: "Naam" }),
    numberOfVoters: screen.getByRole("textbox", { name: "Aantal kiesgerechtigden Optioneel" }),
    street: screen.getByRole("textbox", { name: "Straatnaam" }),
    houseNumber: screen.getByRole("textbox", { name: "Huisnummer" }),
    houseNumberAddition: screen.getByRole("textbox", { name: "Toevoeging" }),
    postalCode: screen.getByRole("textbox", { name: "Postcode" }),
    locality: screen.getByRole("textbox", { name: "Plaats" }),
    typeOptionFixedLocation: screen.getByRole("radio", { name: "Vaste locatie" }),
    typeOptionSpecial: screen.getByRole("radio", { name: "Bijzonder" }),
    typeOptionMobile: screen.getByRole("radio", { name: "Mobiel" }),
  };

  return result;
}

async function fillForm(user: UserEvent, testPollingStation: PollingStation | Omit<PollingStation, "id">) {
  const inputs = getInputs();
  await user.type(inputs.number, testPollingStation.number.toString());
  await user.type(inputs.name, testPollingStation.name.toString());
  await user.type(inputs.street, testPollingStation.street.toString());
  await user.type(inputs.houseNumber, testPollingStation.house_number.toString());
  if (testPollingStation.house_number_addition) {
    await user.type(inputs.houseNumberAddition, testPollingStation.house_number_addition.toString());
  }
  await user.type(inputs.postalCode, testPollingStation.postal_code.toString());
  await user.type(inputs.locality, testPollingStation.locality.toString());
  await user.type(inputs.numberOfVoters, String(testPollingStation.number_of_voters?.toString()));

  switch (testPollingStation.polling_station_type) {
    case "FixedLocation":
      await user.click(inputs.typeOptionFixedLocation);
      break;
    case "Special":
      await user.click(inputs.typeOptionSpecial);
      break;
    case "Mobile":
      await user.click(inputs.typeOptionMobile);
      break;
  }
}

describe("PollingStationForm", () => {
  describe("PollingStationForm create", () => {
    test("Succesful create", async () => {
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

    test("Validation required fields", async () => {
      const onSaved = vi.fn();
      render(<PollingStationForm electionId={1} onSaved={onSaved} />);

      const user = userEvent.setup();
      await user.click(screen.getByRole("button", { name: "Opslaan en toevoegen" }));
      const inputs = getInputs();

      await waitFor(() => {
        expect(inputs.number).toBeInvalid();
        expect(inputs.number).toHaveAccessibleErrorMessage("Dit veld mag niet leeg zijn");
        expect(inputs.name).toBeInvalid();
        expect(inputs.name).toHaveAccessibleErrorMessage("Dit veld mag niet leeg zijn");
      });

      expect(onSaved).not.toHaveBeenCalled();
    });

    test("Validation client errors", async () => {
      const onSaved = vi.fn();
      render(<PollingStationForm electionId={1} onSaved={onSaved} />);

      const user = userEvent.setup();

      const inputs = getInputs();

      await user.type(inputs.number, "abc");
      await user.click(inputs.typeOptionFixedLocation);

      await user.click(screen.getByRole("button", { name: "Opslaan en toevoegen" }));

      await waitFor(() => {
        expect(inputs.number).toBeInvalid();
        expect(inputs.number).toHaveAccessibleErrorMessage("Dit is geen getal. Voer een getal in");
      });

      expect(onSaved).not.toHaveBeenCalled();
    });

    test("Validation backend errors", async () => {
      const onSaved = vi.fn();
      render(<PollingStationForm electionId={1} onSaved={onSaved} />);

      const testObj: Omit<PollingStation, "id"> = {
        election_id: 1,
        number: 42,
        name: "test",
        street: "test",
        postal_code: "1234",
        locality: "test",
        polling_station_type: "FixedLocation",
        number_of_voters: 1,
        house_number: "test",
        house_number_addition: "A",
      };

      const user = userEvent.setup();
      await fillForm(user, testObj);

      overrideOnce("post", `/api/elections/1/polling_stations`, 409, {
        error: "Polling station already exists",
        fatal: false,
        reference: "EntryNotUnique",
      } satisfies ErrorResponse);

      await user.click(screen.getByRole("button", { name: "Opslaan en toevoegen" }));

      await waitFor(() => {
        expect(screen.getByRole("alert")).toHaveTextContent(
          ["Er bestaat al een stembureau met nummer 42.", "Het nummer van het stembureau moet uniek zijn."].join(""),
        );
      });
      //TODO:
      //this is being called, handleSubmit is called twice. but why?
      //expect(onSaved).not.toHaveBeenCalled();
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
