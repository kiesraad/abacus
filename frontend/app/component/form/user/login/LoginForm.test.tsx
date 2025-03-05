import userEvent from "@testing-library/user-event";
import { describe, expect, test } from "vitest";

import { LoginHandler } from "@kiesraad/api-mocks";
import { overrideOnce, render, screen, server, spyOnHandler, waitFor } from "@kiesraad/test";

import { LoginForm } from "./LoginForm";

describe("LoginForm", () => {
  test("Successful login", async () => {
    server.use(LoginHandler);
    const login = spyOnHandler(LoginHandler);

    render(<LoginForm />);

    const user = userEvent.setup();

    const username = screen.getByLabelText("Gebruikersnaam");
    await user.type(username, "user");
    const password = screen.getByLabelText("Wachtwoord");
    await user.type(password, "password");

    const submitButton = screen.getByRole("button", { name: "Inloggen" });
    await user.click(submitButton);

    expect(login).toHaveBeenCalledWith({ username: "user", password: "password" });
  });

  test("Unsuccessful login", async () => {
    render(<LoginForm />);

    overrideOnce("post", "/api/user/login", 401, {
      error: "Invalid username and/or password",
      fatal: false,
      reference: "InvalidUsernameOrPassword",
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
