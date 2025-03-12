import { within } from "@testing-library/dom";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, Mock, test, vi } from "vitest";

import { render, screen, server, spyOnHandler } from "@kiesraad/test";

import { AccountUpdateRequestHandler, loginResponseMockData } from "@/testing/api-mocks";
import { LoginResponse } from "@/types/generated/openapi";

import { AccountSetupForm } from "./AccountSetupForm";

async function renderForm(user: Partial<LoginResponse> = {}) {
  const onSaved = vi.fn();

  render(
    <AccountSetupForm
      user={{ username: "Invoerder01", ...user } as LoginResponse}
      onSaved={onSaved}
    ></AccountSetupForm>,
  );

  expect(await screen.findByRole("heading", { name: "Personaliseer je account" })).toBeInTheDocument();
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
    await user.type(screen.getByLabelText("Jouw naam (roepnaam + achternaam)"), "First Last");
    await user.type(screen.getByLabelText("Kies nieuw wachtwoord"), "password*password");
    await user.type(screen.getByLabelText("Herhaal wachtwoord"), "password*password");

    const submitButton = screen.getByRole("button", { name: "Volgende" });
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

    const loginSuccess = screen.getByRole("alert");
    expect(await within(loginSuccess).findByRole("heading", { name: "Inloggen gelukt" })).toBeVisible();

    const user = userEvent.setup();
    await user.click(await within(loginSuccess).findByRole("button"));

    expect(loginSuccess).not.toBeInTheDocument();
  });

  test("Hide login success on submit", async () => {
    await renderForm();

    const loginSuccess = screen.getByRole("alert");
    expect(await within(loginSuccess).findByRole("heading", { name: "Inloggen gelukt" })).toBeVisible();

    const user = userEvent.setup();
    const submitButton = screen.getByRole("button", { name: "Volgende" });
    await user.click(submitButton);

    expect(loginSuccess).not.toBeInTheDocument();
  });

  test("Required fields", async () => {
    const { onSaved } = await renderForm();

    const user = userEvent.setup();
    const submitButton = screen.getByRole("button", { name: "Volgende" });
    await user.click(submitButton);

    const fullname = screen.getByLabelText("Jouw naam (roepnaam + achternaam)");
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
    await user.type(screen.getByLabelText("Jouw naam (roepnaam + achternaam)"), "First Last");
    await user.type(screen.getByLabelText("Kies nieuw wachtwoord"), "password*password");

    const passwordRepeat = screen.getByLabelText("Herhaal wachtwoord");
    await user.type(passwordRepeat, "something_else");

    const submitButton = screen.getByRole("button", { name: "Volgende" });
    await user.click(submitButton);

    expect(passwordRepeat).toBeInvalid();
    expect(passwordRepeat).toHaveAccessibleErrorMessage("De wachtwoorden komen niet overeen");

    expect(updateAccount).not.toHaveBeenCalled();
    expect(onSaved).not.toHaveBeenCalled();
  });

  test("Fullname prefilled", async () => {
    await renderForm({ fullname: "Roep Achternaam" });

    const fullname = screen.getByLabelText("Jouw naam (roepnaam + achternaam)");
    expect(fullname).toHaveValue("Roep Achternaam");

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Volgende" }));
    expect(fullname).not.toBeInvalid();
    expect(fullname).not.toHaveAccessibleErrorMessage("Dit veld mag niet leeg zijn");
  });
});
