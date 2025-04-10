import { screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { beforeEach, describe, expect, Mock, test, vi } from "vitest";

import { User, USER_UPDATE_REQUEST_PATH } from "@/api";
import { overrideOnce, render, server, spyOnHandler } from "@/testing";
import { UserUpdateRequestHandler } from "@/testing/api-mocks/RequestHandlers";
import { userMockData } from "@/testing/api-mocks/UserMockData";

import { UserUpdateForm } from "./UserUpdateForm";

async function renderForm(user: Partial<User> = {}) {
  const onSaved = vi.fn();
  const onAbort = vi.fn();

  render(
    <UserUpdateForm
      user={{ id: 1, role: "typist", username: "Gebruiker01", ...user } as User}
      onSaved={onSaved}
      onAbort={onAbort}
    ></UserUpdateForm>,
  );

  expect(await screen.findByRole("heading", { name: "Details van het account" })).toBeInTheDocument();
  return { onSaved, onAbort };
}

describe("UserUpdateForm", () => {
  let updateUser: Mock;

  beforeEach(() => {
    server.use(UserUpdateRequestHandler);
    updateUser = spyOnHandler(UserUpdateRequestHandler);
  });

  test("renders username and role", async () => {
    await renderForm();
    expect(await screen.findByText("Gebruiker01")).toBeInTheDocument();
    expect(await screen.findByText("Invoerder")).toBeInTheDocument();
  });

  test("fullname field", async () => {
    const { onSaved } = await renderForm({ fullname: "Voor en Achternaam" });
    const fullnameInput = screen.getByLabelText("Volledige naam");
    expect(fullnameInput).toBeInTheDocument();
    expect(fullnameInput).toHaveValue("Voor en Achternaam");

    const user = userEvent.setup();
    await user.clear(fullnameInput);
    await user.click(screen.getByRole("button", { name: "Wijzigingen opslaan" }));

    expect(updateUser).not.toHaveBeenCalled();
    expect(onSaved).not.toHaveBeenCalled();
    expect(fullnameInput).toBeInvalid();
    expect(fullnameInput).toHaveAccessibleErrorMessage("Dit veld mag niet leeg zijn");

    await user.type(fullnameInput, "Nieuwe Naam");
    await user.click(screen.getByRole("button", { name: "Wijzigingen opslaan" }));

    expect(updateUser).toHaveBeenCalledExactlyOnceWith({
      fullname: "Nieuwe Naam",
    });

    expect(onSaved).toHaveBeenCalledExactlyOnceWith(userMockData[0]);
  });

  test("without fullname", async () => {
    const { onSaved } = await renderForm({ fullname: undefined });
    expect(screen.queryByLabelText("Volledige naam")).not.toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Wijzigingen opslaan" }));

    expect(updateUser).toHaveBeenCalledExactlyOnceWith({});
    expect(onSaved).toHaveBeenCalledExactlyOnceWith(userMockData[0]);
  });

  test("password field", async () => {
    const { onSaved } = await renderForm();

    overrideOnce("put", "/api/user/1" satisfies USER_UPDATE_REQUEST_PATH, 400, {
      error: "Invalid password",
      fatal: false,
      reference: "PasswordRejection",
    });

    const user = userEvent.setup();
    expect(screen.queryByLabelText("Nieuw wachtwoord")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Wijzig wachtwoord" }));

    const passwordInput = await screen.findByLabelText("Nieuw wachtwoord");
    expect(passwordInput).toBeInTheDocument();
    expect(passwordInput).toHaveValue("");

    expect(screen.queryByRole("button", { name: "Wijzig wachtwoord" })).not.toBeInTheDocument();

    const save = screen.getByRole("button", { name: "Wijzigingen opslaan" });
    await user.click(save);

    expect(passwordInput).toBeInvalid();
    expect(passwordInput).toHaveAccessibleErrorMessage("Dit veld mag niet leeg zijn");

    await user.type(passwordInput, "Vol");
    await user.click(save);
    expect(passwordInput).toHaveAccessibleErrorMessage("Het opgegeven wachtwoord voldoet niet aan de eisen");

    await user.type(passwordInput, "doendeKarakters01");
    await user.click(save);

    expect(passwordInput).not.toBeInvalid();
    expect(updateUser).toHaveBeenCalledWith({ temp_password: "VoldoendeKarakters01" });
    expect(onSaved).toHaveBeenCalledExactlyOnceWith(userMockData[0]);
  });

  test("abort update", async () => {
    const { onAbort, onSaved } = await renderForm();
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Annuleren" }));
    expect(onAbort).toHaveBeenCalledOnce();
    expect(updateUser).not.toHaveBeenCalled();
    expect(onSaved).not.toHaveBeenCalled();
  });
});
