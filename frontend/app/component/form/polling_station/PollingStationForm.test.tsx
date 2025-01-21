import { UserEvent, userEvent } from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";

import { ErrorResponse, PollingStation } from "@kiesraad/api";
import { overrideOnce, render, screen, waitFor } from "@kiesraad/test";

import { PollingStationForm } from "./PollingStationForm";

function getInputs() {
  return {
    number: screen.getByRole("textbox", { name: "Nummer" }),
    name: screen.getByRole("textbox", { name: "Naam" }),
    numberOfVoters: screen.getByRole("textbox", { name: "Aantal kiesgerechtigden Optioneel" }),
    address: screen.getByRole("textbox", { name: "Straatnaam en huisnummer" }),
    postalCode: screen.getByRole("textbox", { name: "Postcode" }),
    locality: screen.getByRole("textbox", { name: "Plaats" }),
    typeOptionFixedLocation: screen.getByRole("radio", { name: "Vaste locatie" }),
    typeOptionSpecial: screen.getByRole("radio", { name: "Bijzonder" }),
    typeOptionMobile: screen.getByRole("radio", { name: "Mobiel" }),
  };
}

async function fillForm(user: UserEvent, testPollingStation: PollingStation | Omit<PollingStation, "id">) {
  const inputs = getInputs();
  await user.type(inputs.number, testPollingStation.number.toString());
  await user.type(inputs.name, testPollingStation.name.toString());
  await user.type(inputs.address, testPollingStation.address.toString());
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
    test("Successful create", async () => {
      const testPollingStation: Omit<PollingStation, "id"> = {
        election_id: 1,
        number: 1,
        name: "test",
        address: "Teststraat 1",
        postal_code: "1234",
        locality: "test",
        polling_station_type: "FixedLocation",
        number_of_voters: 1,
      };

      const createdPollingStation: PollingStation = { id: 99, ...testPollingStation };
      overrideOnce("post", "/api/elections/1/polling_stations", 201, createdPollingStation);

      const onSaved = vi.fn();
      render(<PollingStationForm electionId={1} onSaved={onSaved} />);

      const user = userEvent.setup();
      await fillForm(user, testPollingStation);

      await user.click(screen.getByRole("button", { name: "Opslaan en toevoegen" }));

      await waitFor(() => {
        expect(onSaved).toHaveBeenCalledWith(createdPollingStation);
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
        address: "Teststraat 5A",
        postal_code: "1234",
        locality: "test",
        polling_station_type: "FixedLocation",
        number_of_voters: 1,
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

      expect(onSaved).not.toHaveBeenCalled();
    });
  });

  test("PollingStationForm update", async () => {
    const testPollingStation: PollingStation = {
      id: 1,
      election_id: 1,
      number: 1,
      name: "test",
      address: "Teststraat 2",
      postal_code: "1234",
      locality: "test",
      polling_station_type: "FixedLocation",
      number_of_voters: 1,
    };

    const onSaved = vi.fn();

    render(<PollingStationForm electionId={1} onSaved={onSaved} pollingStation={testPollingStation} />);

    const user = userEvent.setup();

    const input = await screen.findByRole("textbox", { name: "Naam" });
    await user.clear(input);
    await user.type(input, "test2");

    await user.click(screen.getByRole("button", { name: "Wijzigingen opslaan" }));

    await waitFor(() => {
      expect(onSaved).toHaveBeenCalled();
    });
  });
});
