import userEvent from "@testing-library/user-event";
import { describe, expect, test } from "vitest";

import { overrideOnce, render, screen, waitFor } from "@kiesraad/test";

import { ChangePasswordForm } from "./ChangePasswordForm";

describe("ChangePasswordForm", () => {
  test("Successful change-password", async () => {
    render(<ChangePasswordForm />);
    let requestBody: object | null = null;

    overrideOnce(
      "post",
      "/api/user/change-password",
      200,
      {
        user_id: 1,
        username: "user",
      },
      undefined,
      async (request) => {
        requestBody = (await request.json()) as object;
      },
    );

    const user = userEvent.setup();

    const password = screen.getByLabelText("Wachtwoord");
    await user.type(password, "password");
    const newPassword = screen.getByLabelText("Kies nieuw wachtwoord");
    await user.type(newPassword, "password_new");
    const repeatPassword = screen.getByLabelText("Herhaal het wachtwoord dat je net hebt ingevuld");
    await user.type(repeatPassword, "password_new");

    const submitButton = screen.getByRole("button", { name: "Opslaan" });
    await user.click(submitButton);

    await waitFor(() => {
      expect(requestBody).toStrictEqual({ password: "password", newPassword: "password_new" });
    });
  });

  test("Unsuccessful change-password", async () => {
    render(<ChangePasswordForm />);

    overrideOnce("post", "/api/user/change-password", 401, {
      error: "Invalid username and/or password",
      fatal: false,
      reference: "InvalidUsernamePassword",
    });

    const user = userEvent.setup();

    const password = screen.getByLabelText("Wachtwoord");
    await user.type(password, "password-wrong");
    const newPassword = screen.getByLabelText("Kies nieuw wachtwoord");
    await user.type(newPassword, "password_new");
    const repeatPassword = screen.getByLabelText("Herhaal het wachtwoord dat je net hebt ingevuld");
    await user.type(repeatPassword, "password_new");

    const submitButton = screen.getByRole("button", { name: "Opslaan" });
    await user.click(submitButton);

    await waitFor(async () => {
      expect(await screen.findByText("De gebruikersnaam of het wachtwoord is onjuist")).toBeVisible();
    });
  });
});
