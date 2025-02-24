import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test } from "vitest";

import { ApiProvider } from "@kiesraad/api";
import { WhoAmIRequestHandler } from "@kiesraad/api-mocks";
import { overrideOnce, screen, server, waitFor } from "@kiesraad/test";

import { ChangePasswordForm } from "./ChangePasswordForm";

describe("ChangePasswordForm", () => {
  beforeEach(() => {
    server.use(WhoAmIRequestHandler);
  });

  test("Successful change-password", async () => {
    render(
      <ApiProvider fetchInitialUser={true}>
        <ChangePasswordForm />
      </ApiProvider>,
    );

    let requestBody: object | null = null;

    overrideOnce(
      "post",
      "/api/user/change-password",
      200,
      {
        user_id: 1,
        username: "admin",
      },
      undefined,
      async (request) => {
        requestBody = (await request.json()) as object;
      },
    );

    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText("Wachtwoord")).toBeVisible();
    });

    const password = screen.getByLabelText("Wachtwoord");
    await user.type(password, "password");
    const newPassword = screen.getByLabelText("Kies nieuw wachtwoord");
    await user.type(newPassword, "password_new");
    const repeatPassword = screen.getByLabelText("Herhaal het wachtwoord dat je net hebt ingevuld");
    await user.type(repeatPassword, "password_new");

    const submitButton = screen.getByRole("button", { name: "Opslaan" });
    await user.click(submitButton);

    await waitFor(() => {
      expect(requestBody).toStrictEqual({ username: "admin", password: "password", new_password: "password_new" });
    });
  });

  test("Incorrect password repeat in change-password form", async () => {
    render(
      <ApiProvider fetchInitialUser={true}>
        <ChangePasswordForm />
      </ApiProvider>,
    );

    overrideOnce("post", "/api/user/change-password", 401, {
      error: "Invalid username and/or password",
      fatal: false,
      reference: "InvalidPassword",
    });

    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText("Wachtwoord")).toBeVisible();
    });

    const password = screen.getByLabelText("Wachtwoord");
    await user.type(password, "password");
    const newPassword = screen.getByLabelText("Kies nieuw wachtwoord");
    await user.type(newPassword, "password_new");
    const repeatPassword = screen.getByLabelText("Herhaal het wachtwoord dat je net hebt ingevuld");
    await user.type(repeatPassword, "password_new_wrong");

    const submitButton = screen.getByRole("button", { name: "Opslaan" });
    await user.click(submitButton);

    await waitFor(async () => {
      expect(await screen.findByText("De wachtwoorden komen niet overeen")).toBeVisible();
    });
  });

  test("Unsuccessful change-password", async () => {
    render(
      <ApiProvider fetchInitialUser={true}>
        <ChangePasswordForm />
      </ApiProvider>,
    );

    overrideOnce("post", "/api/user/change-password", 401, {
      error: "Invalid username and/or password",
      fatal: false,
      reference: "InvalidPassword",
    });

    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText("Wachtwoord")).toBeVisible();
    });

    const password = screen.getByLabelText("Wachtwoord");
    await user.type(password, "password-wrong");
    const newPassword = screen.getByLabelText("Kies nieuw wachtwoord");
    await user.type(newPassword, "password_new");
    const repeatPassword = screen.getByLabelText("Herhaal het wachtwoord dat je net hebt ingevuld");
    await user.type(repeatPassword, "password_new");

    const submitButton = screen.getByRole("button", { name: "Opslaan" });
    await user.click(submitButton);

    await waitFor(async () => {
      expect(await screen.findByText("Het opgegeven wachtwoord is onjuist")).toBeVisible();
    });
  });
});
