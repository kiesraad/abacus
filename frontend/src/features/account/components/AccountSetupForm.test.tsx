import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, type Mock, test, vi } from "vitest";

import { AccountUpdateRequestHandler } from "@/testing/api-mocks/RequestHandlers";
import { loginResponseMockData } from "@/testing/api-mocks/UserMockData";
import { server } from "@/testing/server";
import { render, screen, spyOnHandler, within } from "@/testing/test-utils";
import type { LoginResponse } from "@/types/generated/openapi";

import { AccountSetupForm } from "./AccountSetupForm";

async function renderForm(user: Partial<LoginResponse> = {}) {
  const onSaved = vi.fn();

  render(
    <AccountSetupForm
      user={{ username: "Invoerder01", ...user } as LoginResponse}
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
      username: "Invoerder01",
      fullname: "First Last",
      password: "password*password",
    });

    expect(onSaved).toHaveBeenCalledWith(loginResponseMockData);
  });

  test("Login success alert", async () => {
    await renderForm();

    const loginSuccess = await screen.findByRole("alert");
    expect(within(loginSuccess).getByRole("strong")).toHaveTextContent("Inloggen gelukt");

    const user = userEvent.setup();
    await user.click(within(loginSuccess).getByRole("button", { name: "Melding sluiten" }));

    expect(loginSuccess).not.toBeInTheDocument();
  });

  test("Hide login success on submit", async () => {
    await renderForm();

    const loginSuccess = await screen.findByRole("alert");
    expect(within(loginSuccess).getByRole("strong")).toHaveTextContent("Inloggen gelukt");

    const user = userEvent.setup();
    const submitButton = screen.getByRole("button", { name: "Opslaan" });
    await user.click(submitButton);

    expect(loginSuccess).not.toBeInTheDocument();
  });

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
    expect(password).toHaveAccessibleErrorMessage(/Gebruik minimaal 13 karakters/);

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

  test("Fullname prefilled", async () => {
    await renderForm({ fullname: "Roep Achternaam" });

    const fullname = screen.getByRole("textbox", { name: "Jouw naam (roepnaam + achternaam)" });
    expect(fullname).toHaveValue("Roep Achternaam");

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Opslaan" }));
    expect(fullname).not.toBeInvalid();
    expect(fullname).not.toHaveAccessibleErrorMessage("Dit veld mag niet leeg zijn");
  });
});
