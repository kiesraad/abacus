import { type UserEvent, userEvent } from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { PollingStationCreateHandler, PollingStationUpdateHandler } from "@/testing/api-mocks/RequestHandlers";
import { overrideOnce, server } from "@/testing/server";
import { render, screen, waitFor, within } from "@/testing/test-utils";
import type { ErrorResponse, PollingStation } from "@/types/generated/openapi";

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
    typeOptionSpecial: screen.getByRole("radio", { name: "Bijzonder (afwijkende openingstijden)" }),
    typeOptionMobile: screen.getByRole("radio", { name: "Mobiel" }),
  };
}

async function fillForm(user: UserEvent, testPollingStation: PollingStation | Omit<PollingStation, "id">) {
  const inputs = getInputs();
  await user.type(inputs.number, testPollingStation.number.toString());
  await user.type(inputs.name, testPollingStation.name);
  await user.type(inputs.address, testPollingStation.address);
  await user.type(inputs.postalCode, testPollingStation.postal_code);
  await user.type(inputs.locality, testPollingStation.locality);
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
  beforeEach(() => {
    server.use(PollingStationCreateHandler, PollingStationUpdateHandler);
  });

  describe("PollingStationForm create", () => {
    test("Successful create", async () => {
      const testPollingStation: Omit<PollingStation, "id"> = {
        election_id: 1,
        committee_session_id: 1,
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

    test("Validation client error - invalid polling station number: asd", async () => {
      const onSaved = vi.fn();
      render(<PollingStationForm electionId={1} onSaved={onSaved} />);

      const user = userEvent.setup();

      const inputs = getInputs();

      await user.type(inputs.number, "asd");

      await user.click(screen.getByRole("button", { name: "Opslaan en toevoegen" }));

      await waitFor(() => {
        expect(inputs.number).toBeInvalid();
        expect(inputs.number).toHaveAccessibleErrorMessage("Dit is geen getal. Voer een getal in");
      });

      expect(onSaved).not.toHaveBeenCalled();
    });

    test("Validation client error - invalid polling station number: 0", async () => {
      const onSaved = vi.fn();
      render(<PollingStationForm electionId={1} onSaved={onSaved} />);

      const user = userEvent.setup();

      const inputs = getInputs();

      await user.type(inputs.number, "0");

      await user.click(screen.getByRole("button", { name: "Opslaan en toevoegen" }));

      await waitFor(() => {
        expect(inputs.number).toBeInvalid();
        expect(inputs.number).toHaveAccessibleErrorMessage("Waarde is te laag");
      });

      expect(onSaved).not.toHaveBeenCalled();
    });

    test("Validation backend errors", async () => {
      const onSaved = vi.fn();
      render(<PollingStationForm electionId={1} onSaved={onSaved} />);

      const testObj: Omit<PollingStation, "id"> = {
        election_id: 1,
        committee_session_id: 1,
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

      const alert = await screen.findByRole("alert");
      expect(within(alert).getByRole("strong")).toHaveTextContent("Er bestaat al een stembureau met nummer 42.");
      expect(within(alert).getByRole("paragraph")).toHaveTextContent("Het nummer van het stembureau moet uniek zijn.");

      expect(onSaved).not.toHaveBeenCalled();
    });
  });

  describe("PollingStationForm update", () => {
    test("Successful update", async () => {
      const testPollingStation: PollingStation = {
        id: 1,
        election_id: 1,
        committee_session_id: 1,
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

    test.each([undefined, 42])("Successful update", async (id_prev_session) => {
      const testPollingStation: PollingStation = {
        id: 1,
        election_id: 1,
        committee_session_id: 1,
        id_prev_session,
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

    test("Number should be disabled when polling station is linked to previous session", () => {
      const testPollingStation: PollingStation = {
        id: 1,
        election_id: 1,
        committee_session_id: 1,
        id_prev_session: 42,
        number: 1234,
        name: "test",
        address: "Teststraat 2",
        postal_code: "1234",
        locality: "test",
        polling_station_type: "FixedLocation",
        number_of_voters: 1,
      };
      const onSaved = vi.fn();

      // Disabled with id_prev_session defined
      render(<PollingStationForm electionId={1} onSaved={onSaved} pollingStation={testPollingStation} />);
      expect(screen.queryByRole("textbox", { name: "Nummer" })).not.toBeInTheDocument();
      expect(screen.getByText("1234")).toHaveClass("disabled_input");

      // Enabled with id_prev_session undefined
      testPollingStation.id_prev_session = undefined;
      render(<PollingStationForm electionId={1} onSaved={onSaved} pollingStation={testPollingStation} />);
      expect(screen.queryByRole("textbox", { name: "Nummer" })).toBeInTheDocument();
    });
  });

  test("Client errors after server error", async () => {
    const onSaved = vi.fn();
    render(<PollingStationForm electionId={1} onSaved={onSaved} />);
    const inputs = getInputs();

    const user = userEvent.setup();

    //generate server error:
    overrideOnce("post", `/api/elections/1/polling_stations`, 409, {
      error: "Polling station already exists",
      fatal: false,
      reference: "EntryNotUnique",
    } satisfies ErrorResponse);
    await user.type(inputs.number, "42");
    await user.type(inputs.name, "A great name");

    await user.click(screen.getByRole("button", { name: "Opslaan en toevoegen" }));

    const alert = await screen.findByRole("alert");
    expect(within(alert).getByRole("strong")).toHaveTextContent("Er bestaat al een stembureau met nummer 42.");
    expect(within(alert).getByRole("paragraph")).toHaveTextContent("Het nummer van het stembureau moet uniek zijn.");

    //generate client error:
    await user.type(inputs.number, "asd");
    await user.click(screen.getByRole("button", { name: "Opslaan en toevoegen" }));

    await waitFor(() => {
      expect(inputs.number).toHaveAccessibleErrorMessage("Dit is geen getal. Voer een getal in");
    });

    expect(onSaved).not.toHaveBeenCalled();
  });
});
