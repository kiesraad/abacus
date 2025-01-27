import userEvent from "@testing-library/user-event";
import { describe, expect, test } from "vitest";

import { overrideOnce, render, screen, waitFor } from "@kiesraad/test";

import { LoginForm } from "./LoginForm";

describe("LoginForm", () => {
  test("Successful login", async () => {
    render(<LoginForm />);
    let requestBody: object | null = null;

    overrideOnce(
      "post",
      "/api/user/login",
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

    const username = screen.getByLabelText("Gebruikersnaam");
    await user.type(username, "user");
    const password = screen.getByLabelText("Wachtwoord");
    await user.type(password, "password");

    const submitButton = screen.getByRole("button", { name: "Inloggen" });
    await user.click(submitButton);

    await waitFor(() => {
      expect(requestBody).toStrictEqual({ username: "user", password: "password" });
    });
  });

  test("Unsuccessful login", async () => {
    render(<LoginForm />);

    overrideOnce("post", "/api/user/login", 401, {
      error: "Invalid username and/or password",
      fatal: false,
      reference: "InvalidUsernamePassword",
    });

    const user = userEvent.setup();

    const username = screen.getByLabelText("Gebruikersnaam");
    await user.type(username, "user");
    const password = screen.getByLabelText("Wachtwoord");
    await user.type(password, "wrong");

    const submitButton = screen.getByRole("button", { name: "Inloggen" });
    await user.click(submitButton);

    await waitFor(async () => {
      expect(await screen.findByText("De gebruikersnaam of het wachtwoord is onjuist")).toBeVisible();
    });
  });
});
