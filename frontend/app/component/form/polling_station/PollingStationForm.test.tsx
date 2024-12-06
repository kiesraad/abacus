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

    test("Validation", async () => {
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
      };

      const onSaved = vi.fn();
      render(<PollingStationForm electionId={1} onSaved={onSaved} />);

      const user = userEvent.setup();
      await user.click(screen.getByRole("button", { name: "Opslaan en toevoegen" }));

      const numberInput = screen.getByRole("textbox", { name: "Nummer" });
      const nameInput = screen.getByRole("textbox", { name: "Naam" });
      const numberOfVotersInput = screen.getByRole("textbox", { name: "Aantal kiesgerechtigden Optioneel" });
      const streetInput = screen.getByRole("textbox", { name: "Straatnaam" });
      const houseNumberInput = screen.getByRole("textbox", { name: "Huisnummer" });
      const houseNumberAdditionInput = screen.getByRole("textbox", { name: "Toevoeging" });
      const postalCodeInput = screen.getByRole("textbox", { name: "Postcode" });
      const localityInput = screen.getByRole("textbox", { name: "Plaats" });
      const typeInputOption = screen.getByRole("radio", { name: "Vaste locatie" });

      await user.click(typeInputOption);

      await waitFor(() => {
        expect(numberInput).toHaveAttribute("aria-invalid", "true");
        expect(nameInput).toHaveAttribute("aria-invalid", "true");
        expect(streetInput).toHaveAttribute("aria-invalid", "true");
        expect(houseNumberInput).toHaveAttribute("aria-invalid", "true");
        expect(postalCodeInput).toHaveAttribute("aria-invalid", "true");
        expect(localityInput).toHaveAttribute("aria-invalid", "true");
        expect(numberOfVotersInput).toHaveAttribute("aria-invalid", "false");
        expect(houseNumberAdditionInput).toHaveAttribute("aria-invalid", "false");
      });

      await user.type(nameInput, testObj.name);
      await user.type(streetInput, testObj.street);
      await user.type(houseNumberInput, testObj.house_number);
      await user.type(postalCodeInput, testObj.postal_code);
      await user.type(localityInput, testObj.locality);
      await user.type(numberOfVotersInput, testObj.number_of_voters?.toString() || "");

      await user.click(screen.getByRole("button", { name: "Opslaan en toevoegen" }));

      await waitFor(() => {
        expect(numberInput).toHaveAttribute("aria-invalid", "true");
        expect(nameInput).toHaveAttribute("aria-invalid", "false");
        expect(streetInput).toHaveAttribute("aria-invalid", "false");
        expect(houseNumberInput).toHaveAttribute("aria-invalid", "false");
        expect(postalCodeInput).toHaveAttribute("aria-invalid", "false");
        expect(localityInput).toHaveAttribute("aria-invalid", "false");
        expect(numberOfVotersInput).toHaveAttribute("aria-invalid", "false");
        expect(houseNumberAdditionInput).toHaveAttribute("aria-invalid", "false");
      });

      overrideOnce("post", `/api/elections/1/polling_stations`, 409, {
        error: "Polling station already exists",
        fatal: false,
        reference: "EntryNotUnique",
      } satisfies ErrorResponse);

      await user.type(numberInput, "1");
      await user.click(screen.getByRole("button", { name: "Opslaan en toevoegen" }));

      await waitFor(() => {
        expect(screen.getByRole("alert")).toHaveTextContent(
          ["Er bestaat al een stembureau met nummer 1.", "Het nummer van het stembureau moet uniek zijn."].join(""),
        );
      });

      await user.clear(numberInput);
      await user.type(numberInput, testObj.number.toString());

      await user.click(screen.getByRole("button", { name: "Opslaan en toevoegen" }));

      await waitFor(() => {
        expect(onSaved).toHaveBeenCalledWith(expect.objectContaining(testObj));
      });
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
