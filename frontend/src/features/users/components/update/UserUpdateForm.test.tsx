import { screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";

import { render } from "@/testing";
import { User } from "@/types/generated/openapi";

import { UserUpdateForm } from "./UserUpdateForm";

async function renderForm(user: Partial<User> = {}, saving = false) {
  const onSave = vi.fn();
  const onAbort = vi.fn();

  render(
    <UserUpdateForm
      user={{ role: "typist", username: "Gebruiker01", ...user } as User}
      onSave={onSave}
      onAbort={onAbort}
      saving={saving}
    ></UserUpdateForm>,
  );

  expect(await screen.findByRole("heading", { name: "Details van het account" })).toBeInTheDocument();
  return { onSave, onAbort };
}

describe("UserUpdateForm", () => {
  test("renders username and role", async () => {
    await renderForm();
    expect(await screen.findByText("Gebruiker01")).toBeInTheDocument();
    expect(await screen.findByText("Invoerder")).toBeInTheDocument();
  });

  test("fullname field", async () => {
    const { onSave } = await renderForm({ fullname: "Voor en Achternaam" });
    const fullnameInput = screen.getByLabelText("Volledige naam");
    expect(fullnameInput).toBeInTheDocument();
    expect(fullnameInput).toHaveValue("Voor en Achternaam");

    const user = userEvent.setup();
    await user.clear(fullnameInput);
    await user.click(screen.getByRole("button", { name: "Wijzigingen opslaan" }));

    expect(onSave).not.toHaveBeenCalled();
    expect(fullnameInput).toBeInvalid();
    expect(fullnameInput).toHaveAccessibleErrorMessage("Dit veld mag niet leeg zijn");

    await user.type(fullnameInput, "Nieuwe Naam");
    await user.click(screen.getByRole("button", { name: "Wijzigingen opslaan" }));

    expect(onSave).toHaveBeenCalledExactlyOnceWith({
      fullname: "Nieuwe Naam",
    });
  });

  test("without fullname", async () => {
    const { onSave } = await renderForm({ fullname: undefined });
    expect(screen.queryByLabelText("Volledige naam")).not.toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Wijzigingen opslaan" }));

    expect(onSave).toHaveBeenCalledExactlyOnceWith({});
  });

  test("password field", async () => {
    const { onSave } = await renderForm();

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
    expect(passwordInput).toHaveAccessibleErrorMessage(
      "Dit wachtwoord is niet lang genoeg. Gebruik minimaal 12 karakters",
    );

    await user.type(passwordInput, "doendeKarakters01");
    await user.click(save);

    expect(passwordInput).not.toBeInvalid();
    expect(onSave).toHaveBeenCalledExactlyOnceWith({
      temp_password: "VoldoendeKarakters01",
    });
  });

  test("abort update", async () => {
    const { onAbort, onSave } = await renderForm();
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Annuleren" }));
    expect(onAbort).toHaveBeenCalledOnce();
    expect(onSave).not.toHaveBeenCalled();
  });
});
