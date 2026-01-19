import { userEvent } from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { UserCreateRequestHandler } from "@/testing/api-mocks/RequestHandlers";
import { userMockData } from "@/testing/api-mocks/UserMockData";
import { overrideOnce, server } from "@/testing/server";
import { render, screen, spyOnHandler, within } from "@/testing/test-utils";
import type { Role, USER_CREATE_REQUEST_PATH } from "@/types/generated/openapi";

import { UserCreateDetailsForm } from "./UserCreateDetailsForm";

function renderForm(role: Role, showFullname: boolean) {
  const onSubmitted = vi.fn();
  render(<UserCreateDetailsForm role={role} showFullname={showFullname} onSubmitted={onSubmitted} />);
  return { onSubmitted };
}

describe("UserCreateDetailsForm", () => {
  beforeEach(() => {
    server.use(UserCreateRequestHandler);
  });

  test("Render empty form", async () => {
    renderForm("coordinator", true);

    expect(await screen.findByRole("textbox", { name: "Volledige naam" })).toHaveValue("");
    expect(await screen.findByRole("textbox", { name: "Gebruikersnaam" })).toHaveValue("");
    expect(await screen.findByLabelText("Tijdelijk wachtwoord")).toHaveValue("");
  });

  test("Call onSubmitted after submitting fullname fields", async () => {
    const { onSubmitted } = renderForm("coordinator", true);
    const createUser = spyOnHandler(UserCreateRequestHandler);
    const user = userEvent.setup();

    await user.type(await screen.findByRole("textbox", { name: "Volledige naam" }), "Nieuwe Gebruiker");
    await user.type(await screen.findByRole("textbox", { name: "Gebruikersnaam" }), "NieuweGebruiker");
    await user.type(await screen.findByLabelText("Tijdelijk wachtwoord"), "Wachtwoord123");
    await user.click(await screen.findByRole("button", { name: "Opslaan" }));

    expect(createUser).toHaveBeenCalledExactlyOnceWith({
      role: "coordinator",
      fullname: "Nieuwe Gebruiker",
      username: "NieuweGebruiker",
      temp_password: "Wachtwoord123",
    });
    expect(onSubmitted).toHaveBeenCalledExactlyOnceWith(userMockData[0]);
  });

  test("Call onSubmitted after submitting anonymous fields", async () => {
    const { onSubmitted } = renderForm("typist", false);
    const createUser = spyOnHandler(UserCreateRequestHandler);
    const user = userEvent.setup();

    expect(screen.queryByRole("textbox", { name: "Volledige naam" })).not.toBeInTheDocument();
    expect(await screen.findByRole("textbox", { name: "Gebruikersnaam" })).toHaveValue("");
    expect(await screen.findByLabelText("Tijdelijk wachtwoord")).toHaveValue("");

    await user.type(await screen.findByRole("textbox", { name: "Gebruikersnaam" }), "NieuweGebruiker");
    await user.type(await screen.findByLabelText("Tijdelijk wachtwoord"), "Wachtwoord123");

    const submit = await screen.findByRole("button", { name: "Opslaan" });
    await user.click(submit);

    expect(createUser).toHaveBeenCalledExactlyOnceWith({
      role: "typist",
      username: "NieuweGebruiker",
      temp_password: "Wachtwoord123",
    });
    expect(onSubmitted).toHaveBeenCalledExactlyOnceWith(userMockData[0]);
  });

  describe("Validation", () => {
    test("Required fields", async () => {
      const { onSubmitted } = renderForm("coordinator", true);
      const createUser = spyOnHandler(UserCreateRequestHandler);
      const user = userEvent.setup();

      const submit = await screen.findByRole("button", { name: "Opslaan" });
      await user.click(submit);

      const fullname = await screen.findByRole("textbox", { name: "Volledige naam" });
      expect(fullname).toBeInvalid();
      expect(fullname).toHaveAccessibleErrorMessage("Dit veld mag niet leeg zijn");

      const username = await screen.findByRole("textbox", { name: "Gebruikersnaam" });
      expect(username).toBeInvalid();
      expect(username).toHaveAccessibleErrorMessage("Dit veld mag niet leeg zijn");

      const password = await screen.findByLabelText("Tijdelijk wachtwoord");
      expect(password).toBeInvalid();
      expect(password).toHaveAccessibleErrorMessage("Gebruik minimaal 13 karakters");

      expect(createUser).not.toHaveBeenCalled();
      expect(onSubmitted).not.toHaveBeenCalled();
    });

    test("Password equal to username", async () => {
      const { onSubmitted } = renderForm("coordinator", true);
      const createUser = spyOnHandler(UserCreateRequestHandler);
      const user = userEvent.setup();

      await user.type(screen.getByRole("textbox", { name: "Volledige naam" }), "First Last");
      await user.type(screen.getByRole("textbox", { name: "Gebruikersnaam" }), "Coordinator01");
      const password = screen.getByLabelText("Tijdelijk wachtwoord");
      await user.type(password, "Coordinator01");

      const submitButton = screen.getByRole("button", { name: "Opslaan" });
      await user.click(submitButton);

      expect(password).toBeInvalid();
      expect(password).toHaveAccessibleErrorMessage("Het wachtwoord mag niet gelijk zijn aan de gebruikersnaam");

      expect(createUser).not.toHaveBeenCalled();
      expect(onSubmitted).not.toHaveBeenCalled();
    });
  });

  describe("API error handling", () => {
    test("Show username must be unique error", async () => {
      const { onSubmitted } = renderForm("typist", false);
      const user = userEvent.setup();
      overrideOnce("post", "/api/users" satisfies USER_CREATE_REQUEST_PATH, 409, {
        error: "Username already exists",
        fatal: false,
        reference: "UsernameNotUnique",
      });

      const username = await screen.findByRole("textbox", { name: "Gebruikersnaam" });
      const password = await screen.findByLabelText("Tijdelijk wachtwoord");

      await user.type(username, "Dubbel");
      await user.type(password, "Wachtwoord123");
      const saveButton = screen.getByRole("button", { name: "Opslaan" });
      await user.click(saveButton);

      const alert = await screen.findByRole("alert");
      expect(within(alert).getByRole("strong")).toHaveTextContent(
        "Er bestaat al een gebruiker met gebruikersnaam Dubbel",
      );
      expect(within(alert).getByRole("paragraph")).toHaveTextContent("De gebruikersnaam moet uniek zijn");

      expect(username).toBeInvalid();
      expect(username).toHaveAccessibleErrorMessage("De gebruikersnaam moet uniek zijn");
      expect(onSubmitted).not.toHaveBeenCalled();

      // Do not show error when there are validation errors
      await user.clear(password);
      await user.click(saveButton);

      expect(password).toBeInvalid();
      expect(password).toHaveAccessibleErrorMessage("Gebruik minimaal 13 karakters");

      expect(alert).not.toBeInTheDocument();
      expect(username).not.toBeInvalid();
      expect(username).not.toHaveAccessibleErrorMessage();
      expect(onSubmitted).not.toHaveBeenCalled();
    });

    test("Password is the same as username error", async () => {
      const { onSubmitted } = renderForm("typist", false);
      const user = userEvent.setup();
      overrideOnce("post", "/api/users" satisfies USER_CREATE_REQUEST_PATH, 400, {
        error: "Invalid password",
        fatal: false,
        reference: "PasswordRejectionSameAsUsername",
      });

      await user.type(screen.getByRole("textbox", { name: "Gebruikersnaam" }), "Invoerder0123");
      const passwordInput = await screen.findByLabelText("Tijdelijk wachtwoord");
      expect(passwordInput).toBeInTheDocument();
      await user.type(passwordInput, "Invoerder01234");

      const saveButton = screen.getByRole("button", { name: "Opslaan" });
      await user.click(saveButton);

      expect(passwordInput).toBeInvalid();
      expect(passwordInput).toHaveAccessibleErrorMessage(
        "Het opgegeven wachtwoord voldoet niet aan de eisen. Het wachtwoord mag niet gelijk zijn aan de gebruikersnaam.",
      );

      await user.click(saveButton);

      expect(passwordInput).toBeValid();
      expect(onSubmitted).toHaveBeenCalledExactlyOnceWith(userMockData[0]);
    });

    test("Password is too short error", async () => {
      const { onSubmitted } = renderForm("typist", false);
      const user = userEvent.setup();
      overrideOnce("post", "/api/users" satisfies USER_CREATE_REQUEST_PATH, 400, {
        error: "Invalid password",
        fatal: false,
        reference: "PasswordRejectionTooShort",
      });

      await user.type(screen.getByRole("textbox", { name: "Gebruikersnaam" }), "Invoerder0123");
      const passwordInput = await screen.findByLabelText("Tijdelijk wachtwoord");
      await user.type(passwordInput, "Vol");

      const saveButton = screen.getByRole("button", { name: "Opslaan" });
      await user.click(saveButton);

      expect(passwordInput).toBeInvalid();
      expect(passwordInput).toHaveAccessibleErrorMessage(
        "Het opgegeven wachtwoord voldoet niet aan de eisen. Het wachtwoord moet minimaal 13 karakters lang zijn.",
      );

      await user.type(passwordInput, "doendeKarakters01");
      await user.click(saveButton);

      expect(passwordInput).toBeValid();
      expect(onSubmitted).toHaveBeenCalledExactlyOnceWith(userMockData[0]);
    });
  });
});
