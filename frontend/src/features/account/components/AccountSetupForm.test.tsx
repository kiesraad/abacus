import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, type Mock, test, vi } from "vitest";

import { AccountUpdateRequestHandler } from "@/testing/api-mocks/RequestHandlers";
import { loginResponseMockData } from "@/testing/api-mocks/UserMockData";
import { overrideOnce, server } from "@/testing/server";
import { render, screen, spyOnHandler, within } from "@/testing/test-utils";
import type { ACCOUNT_UPDATE_REQUEST_PATH, LoginResponse } from "@/types/generated/openapi";

import { AccountSetupForm } from "./AccountSetupForm";

async function renderForm(user: Partial<LoginResponse> = {}) {
  const onSaved = vi.fn();

  render(
    <AccountSetupForm
      user={{ username: "Invoerder0123", ...user } as LoginResponse}
      onSaved={onSaved}
    ></AccountSetupForm>,
  );

  expect(await screen.findByRole("heading", { level: 2, name: "Personaliseer je account" })).toBeInTheDocument();
  return { onSaved };
}

describe("AccountSetupForm", () => {
  let updateAccount: Mock;

  beforeEach(() => {
    server.use(AccountUpdateRequestHandler);
    updateAccount = spyOnHandler(AccountUpdateRequestHandler);
  });

  test("Successful update", async () => {
    const { onSaved } = await renderForm();
    const user = userEvent.setup();

    await user.type(screen.getByRole("textbox", { name: "Jouw naam (roepnaam + achternaam)" }), "First Last");
    await user.type(screen.getByLabelText("Kies nieuw wachtwoord"), "password*password");
    await user.type(screen.getByLabelText("Herhaal wachtwoord"), "password*password");

    const submitButton = screen.getByRole("button", { name: "Opslaan" });
    await user.click(submitButton);

    expect(updateAccount).toHaveBeenCalledExactlyOnceWith({
      username: "Invoerder0123",
      fullname: "First Last",
      password: "password*password",
    });
    expect(onSaved).toHaveBeenCalledWith(loginResponseMockData);
  });

  test("Login success alert", async () => {
    await renderForm();
    const user = userEvent.setup();

    const loginSuccess = await screen.findByRole("alert");
    expect(within(loginSuccess).getByRole("strong")).toHaveTextContent("Inloggen gelukt");

    await user.click(within(loginSuccess).getByRole("button", { name: "Melding sluiten" }));

    expect(loginSuccess).not.toBeInTheDocument();
  });

  test("Hide login success on submit", async () => {
    await renderForm();
    const user = userEvent.setup();

    const loginSuccess = await screen.findByRole("alert");
    expect(within(loginSuccess).getByRole("strong")).toHaveTextContent("Inloggen gelukt");

    const submitButton = screen.getByRole("button", { name: "Opslaan" });
    await user.click(submitButton);

    expect(loginSuccess).not.toBeInTheDocument();
  });

  test("Fullname prefilled", async () => {
    await renderForm({ fullname: "Roep Achternaam" });
    const user = userEvent.setup();

    const fullname = screen.getByRole("textbox", { name: "Jouw naam (roepnaam + achternaam)" });
    expect(fullname).toHaveValue("Roep Achternaam");

    await user.click(screen.getByRole("button", { name: "Opslaan" }));

    expect(fullname).not.toBeInvalid();
    expect(fullname).not.toHaveAccessibleErrorMessage("Dit veld mag niet leeg zijn");
  });

  describe("Validation", () => {
    test("Required fields", async () => {
      const { onSaved } = await renderForm();
      const user = userEvent.setup();

      const submitButton = screen.getByRole("button", { name: "Opslaan" });
      await user.click(submitButton);

      const fullname = screen.getByRole("textbox", { name: "Jouw naam (roepnaam + achternaam)" });
      expect(fullname).toBeInvalid();
      expect(fullname).toHaveAccessibleErrorMessage("Dit veld mag niet leeg zijn");

      const password = screen.getByLabelText("Kies nieuw wachtwoord");
      expect(password).toBeInvalid();
      expect(password).toHaveAccessibleErrorMessage("Gebruik minimaal 13 karakters");

      expect(updateAccount).not.toHaveBeenCalled();
      expect(onSaved).not.toHaveBeenCalled();
    });

    test("Password equal to username", async () => {
      const { onSaved } = await renderForm();
      const user = userEvent.setup();

      await user.type(screen.getByRole("textbox", { name: "Jouw naam (roepnaam + achternaam)" }), "First Last");
      const password = screen.getByLabelText("Kies nieuw wachtwoord");
      await user.type(password, "Invoerder0123");
      await user.type(screen.getByLabelText("Herhaal wachtwoord"), "Invoerder0123");

      const submitButton = screen.getByRole("button", { name: "Opslaan" });
      await user.click(submitButton);

      expect(password).toBeInvalid();
      expect(password).toHaveAccessibleErrorMessage("Het wachtwoord mag niet gelijk zijn aan de gebruikersnaam");

      expect(updateAccount).not.toHaveBeenCalled();
      expect(onSaved).not.toHaveBeenCalled();
    });

    test("Password mismatch", async () => {
      const { onSaved } = await renderForm();
      const user = userEvent.setup();

      await user.type(screen.getByRole("textbox", { name: "Jouw naam (roepnaam + achternaam)" }), "First Last");
      await user.type(screen.getByLabelText("Kies nieuw wachtwoord"), "password*password");

      const passwordRepeat = screen.getByLabelText("Herhaal wachtwoord");
      await user.type(passwordRepeat, "something_else");

      const submitButton = screen.getByRole("button", { name: "Opslaan" });
      await user.click(submitButton);

      expect(passwordRepeat).toBeInvalid();
      expect(passwordRepeat).toHaveAccessibleErrorMessage("De wachtwoorden komen niet overeen");

      expect(updateAccount).not.toHaveBeenCalled();
      expect(onSaved).not.toHaveBeenCalled();
    });
  });

  describe("API error handling", () => {
    test("New password is the same as old password error", async () => {
      const { onSaved } = await renderForm();
      const user = userEvent.setup();
      overrideOnce("put", "/api/account" satisfies ACCOUNT_UPDATE_REQUEST_PATH, 400, {
        error: "Invalid password",
        fatal: false,
        reference: "NewPasswordSameAsOldPassword",
      });

      await user.type(screen.getByRole("textbox", { name: "Jouw naam (roepnaam + achternaam)" }), "First Last");
      const password = screen.getByLabelText("Kies nieuw wachtwoord");
      await user.type(password, "password*password");
      await user.type(screen.getByLabelText("Herhaal wachtwoord"), "password*password");

      const submitButton = screen.getByRole("button", { name: "Opslaan" });
      await user.click(submitButton);

      expect(password).toBeInvalid();
      expect(password).toHaveAccessibleErrorMessage(
        "Het opgegeven wachtwoord voldoet niet aan de eisen. Het nieuwe wachtwoord mag niet gelijk zijn aan het oude wachtwoord.",
      );

      await user.click(submitButton);

      expect(password).toBeValid();
      expect(updateAccount).toHaveBeenCalledWith({
        fullname: "First Last",
        password: "password*password",
        username: "Invoerder0123",
      });
      expect(onSaved).toHaveBeenCalledExactlyOnceWith(loginResponseMockData);
    });

    test("Password is too short error", async () => {
      const { onSaved } = await renderForm();
      const user = userEvent.setup();
      overrideOnce("put", "/api/account" satisfies ACCOUNT_UPDATE_REQUEST_PATH, 400, {
        error: "Invalid password",
        fatal: false,
        reference: "PasswordTooShort",
      });

      await user.type(screen.getByRole("textbox", { name: "Jouw naam (roepnaam + achternaam)" }), "First Last");
      const password = screen.getByLabelText("Kies nieuw wachtwoord");
      await user.type(password, "Vol");
      const passwordRepeat = screen.getByLabelText("Herhaal wachtwoord");
      await user.type(passwordRepeat, "Vol");

      const submitButton = screen.getByRole("button", { name: "Opslaan" });
      await user.click(submitButton);

      expect(password).toBeInvalid();
      expect(password).toHaveAccessibleErrorMessage(
        "Het opgegeven wachtwoord voldoet niet aan de eisen. Het wachtwoord moet minimaal 13 karakters lang zijn.",
      );

      await user.type(password, "doendeKarakters01");
      await user.type(passwordRepeat, "doendeKarakters01");
      await user.click(submitButton);

      expect(password).toBeValid();
      expect(updateAccount).toHaveBeenCalledWith({
        fullname: "First Last",
        password: "VoldoendeKarakters01",
        username: "Invoerder0123",
      });
      expect(onSaved).toHaveBeenCalledExactlyOnceWith(loginResponseMockData);
    });

    test("Password is the same as username error", async () => {
      const { onSaved } = await renderForm();
      const user = userEvent.setup();
      overrideOnce("put", "/api/account" satisfies ACCOUNT_UPDATE_REQUEST_PATH, 400, {
        error: "Invalid password",
        fatal: false,
        reference: "PasswordSameAsUsername",
      });

      await user.type(screen.getByRole("textbox", { name: "Jouw naam (roepnaam + achternaam)" }), "First Last");
      const password = screen.getByLabelText("Kies nieuw wachtwoord");
      await user.type(password, "Invoerder01234");
      await user.type(screen.getByLabelText("Herhaal wachtwoord"), "Invoerder01234");

      const submitButton = screen.getByRole("button", { name: "Opslaan" });
      await user.click(submitButton);

      expect(password).toBeInvalid();
      expect(password).toHaveAccessibleErrorMessage(
        "Het opgegeven wachtwoord voldoet niet aan de eisen. Het wachtwoord mag niet gelijk zijn aan de gebruikersnaam.",
      );

      await user.click(submitButton);

      expect(password).toBeValid();
      expect(updateAccount).toHaveBeenCalledWith({
        fullname: "First Last",
        password: "Invoerder01234",
        username: "Invoerder0123",
      });
      expect(onSaved).toHaveBeenCalledExactlyOnceWith(loginResponseMockData);
    });
  });
});
