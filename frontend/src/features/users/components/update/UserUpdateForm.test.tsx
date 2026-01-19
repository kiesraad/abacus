import { userEvent } from "@testing-library/user-event";
import { beforeEach, describe, expect, type Mock, test, vi } from "vitest";

import { UserUpdateRequestHandler } from "@/testing/api-mocks/RequestHandlers";
import { userMockData } from "@/testing/api-mocks/UserMockData";
import { overrideOnce, server } from "@/testing/server";
import { render, screen, spyOnHandler } from "@/testing/test-utils";
import type { USER_UPDATE_REQUEST_PATH, User } from "@/types/generated/openapi";

import { UserUpdateForm } from "./UserUpdateForm";

async function renderForm(user: Partial<User> = {}) {
  const onSaved = vi.fn();
  const onAbort = vi.fn();

  render(
    <UserUpdateForm
      user={{ id: 1, role: "typist", username: "Gebruiker0123", ...user } as User}
      onSaved={onSaved}
      onAbort={onAbort}
    ></UserUpdateForm>,
  );

  expect(await screen.findByRole("heading", { level: 2, name: "Details van het account" })).toBeInTheDocument();
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
    expect(await screen.findByText("Gebruiker0123")).toBeInTheDocument();
    expect(await screen.findByText("Invoerder")).toBeInTheDocument();
  });

  test("fullname field", async () => {
    const { onSaved } = await renderForm({ fullname: "Voor en Achternaam" });
    const fullnameInput = screen.getByRole("textbox", { name: "Volledige naam" });
    expect(fullnameInput).toBeInTheDocument();
    expect(fullnameInput).toHaveValue("Voor en Achternaam");

    const user = userEvent.setup();
    await user.clear(fullnameInput);
    await user.click(screen.getByRole("button", { name: "Wijzigingen opslaan" }));

    expect(fullnameInput).toBeInvalid();
    expect(fullnameInput).toHaveAccessibleErrorMessage("Dit veld mag niet leeg zijn");
    expect(updateUser).not.toHaveBeenCalled();
    expect(onSaved).not.toHaveBeenCalled();

    await user.type(fullnameInput, "Nieuwe Naam");
    await user.click(screen.getByRole("button", { name: "Wijzigingen opslaan" }));

    expect(updateUser).toHaveBeenCalledExactlyOnceWith({ fullname: "Nieuwe Naam" });
    expect(onSaved).toHaveBeenCalledExactlyOnceWith(userMockData[0]);
  });

  test("without fullname", async () => {
    const { onSaved } = await renderForm({ fullname: undefined });
    expect(screen.queryByRole("textbox", { name: "Volledige naam" })).not.toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Wijzigingen opslaan" }));

    expect(updateUser).toHaveBeenCalledExactlyOnceWith({});
    expect(onSaved).toHaveBeenCalledExactlyOnceWith(userMockData[0]);
  });

  test("password field", async () => {
    const { onSaved } = await renderForm();

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
    expect(passwordInput).toHaveAccessibleErrorMessage("Gebruik minimaal 13 karakters");
    expect(updateUser).not.toHaveBeenCalled();
    expect(onSaved).not.toHaveBeenCalled();
  });

  test("abort update", async () => {
    const { onAbort, onSaved } = await renderForm();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Annuleren" }));
    expect(onAbort).toHaveBeenCalledOnce();
    expect(updateUser).not.toHaveBeenCalled();
    expect(onSaved).not.toHaveBeenCalled();
  });

  describe("API error handling", () => {
    test("New password is the same as old password error", async () => {
      const { onSaved } = await renderForm();
      const user = userEvent.setup();
      overrideOnce("put", "/api/users/1" satisfies USER_UPDATE_REQUEST_PATH, 400, {
        error: "Invalid password",
        fatal: false,
        reference: "PasswordRejectionSameAsOld",
      });

      expect(screen.queryByLabelText("Nieuw wachtwoord")).not.toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: "Wijzig wachtwoord" }));

      const passwordInput = await screen.findByLabelText("Nieuw wachtwoord");
      expect(passwordInput).toBeInTheDocument();
      await user.type(passwordInput, "Wachtwoord0123");

      const save = screen.getByRole("button", { name: "Wijzigingen opslaan" });
      await user.click(save);

      expect(passwordInput).toBeInvalid();
      expect(passwordInput).toHaveAccessibleErrorMessage(
        "Het opgegeven wachtwoord voldoet niet aan de eisen. Het nieuwe wachtwoord mag niet gelijk zijn aan het oude wachtwoord.",
      );

      await user.type(passwordInput, "4");
      await user.click(save);

      expect(passwordInput).toBeValid();
      expect(updateUser).toHaveBeenCalledWith({ temp_password: "Wachtwoord01234" });
      expect(onSaved).toHaveBeenCalledExactlyOnceWith(userMockData[0]);
    });

    test("Password is too short error", async () => {
      const { onSaved } = await renderForm();
      const user = userEvent.setup();
      overrideOnce("put", "/api/users/1" satisfies USER_UPDATE_REQUEST_PATH, 400, {
        error: "Invalid password",
        fatal: false,
        reference: "PasswordRejectionTooShort",
      });

      expect(screen.queryByLabelText("Nieuw wachtwoord")).not.toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: "Wijzig wachtwoord" }));

      const passwordInput = await screen.findByLabelText("Nieuw wachtwoord");
      expect(passwordInput).toBeInTheDocument();
      await user.type(passwordInput, "Vol");

      const save = screen.getByRole("button", { name: "Wijzigingen opslaan" });
      await user.click(save);

      expect(passwordInput).toBeInvalid();
      expect(passwordInput).toHaveAccessibleErrorMessage(
        "Het opgegeven wachtwoord voldoet niet aan de eisen. Het wachtwoord moet minimaal 13 karakters lang zijn.",
      );

      await user.type(passwordInput, "doendeKarakters01");
      await user.click(save);

      expect(passwordInput).toBeValid();
      expect(updateUser).toHaveBeenCalledWith({ temp_password: "VoldoendeKarakters01" });
      expect(onSaved).toHaveBeenCalledExactlyOnceWith(userMockData[0]);
    });

    test("Password is the same as username error", async () => {
      const { onSaved } = await renderForm();
      const user = userEvent.setup();
      overrideOnce("put", "/api/users/1" satisfies USER_UPDATE_REQUEST_PATH, 400, {
        error: "Invalid password",
        fatal: false,
        reference: "PasswordRejectionSameAsUsername",
      });

      expect(screen.queryByLabelText("Nieuw wachtwoord")).not.toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: "Wijzig wachtwoord" }));

      const passwordInput = await screen.findByLabelText("Nieuw wachtwoord");
      expect(passwordInput).toBeInTheDocument();
      await user.type(passwordInput, "Gebruiker0123");

      const save = screen.getByRole("button", { name: "Wijzigingen opslaan" });
      await user.click(save);

      expect(passwordInput).toBeInvalid();
      expect(passwordInput).toHaveAccessibleErrorMessage(
        "Het opgegeven wachtwoord voldoet niet aan de eisen. Het wachtwoord mag niet gelijk zijn aan de gebruikersnaam.",
      );

      await user.type(passwordInput, "4");
      await user.click(save);

      expect(passwordInput).toBeValid();
      expect(updateUser).toHaveBeenCalledWith({ temp_password: "Gebruiker01234" });
      expect(onSaved).toHaveBeenCalledExactlyOnceWith(userMockData[0]);
    });
  });
});
