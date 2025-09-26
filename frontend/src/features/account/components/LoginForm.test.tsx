import * as ReactRouter from "react-router";

import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { InitialisedHandler, LoginHandler } from "@/testing/api-mocks/RequestHandlers";
import { overrideOnce, server } from "@/testing/server";
import { render, screen, spyOnHandler, waitFor } from "@/testing/test-utils";
import { LOGIN_REQUEST_PATH, LoginResponse } from "@/types/generated/openapi";

import { LoginForm } from "./LoginForm";

const navigate = vi.fn();

describe("LoginForm", () => {
  beforeEach(() => {
    vi.spyOn(ReactRouter, "useNavigate").mockImplementation(() => navigate);
  });

  const loginUrl: LOGIN_REQUEST_PATH = "/api/login";

  test("Successful login", async () => {
    server.use(LoginHandler, InitialisedHandler);
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

    overrideOnce("post", loginUrl, 401, {
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

  test("Navigate to account setup when password has to be changed", async () => {
    render(<LoginForm />);

    overrideOnce("post", loginUrl, 200, {
      user_id: 33,
      username: "Invoerder01",
      role: "typist",
      fullname: "Al Ingesteld",
      needs_password_change: true,
    } satisfies LoginResponse);

    const user = userEvent.setup();

    await user.type(await screen.findByLabelText("Gebruikersnaam"), "Invoerder01");
    await user.type(await screen.findByLabelText("Wachtwoord"), "Wachtwoord");
    await user.click(await screen.findByRole("button", { name: "Inloggen" }));

    expect(navigate).toHaveBeenCalledWith("/account/setup");
  });

  test("Navigate to account setup when fullname has to be entered", async () => {
    render(<LoginForm />);

    overrideOnce("post", loginUrl, 200, {
      user_id: 33,
      username: "Invoerder01",
      role: "typist",
      needs_password_change: false,
    } satisfies LoginResponse);

    const user = userEvent.setup();

    await user.type(await screen.findByLabelText("Gebruikersnaam"), "Invoerder01");
    await user.type(await screen.findByLabelText("Wachtwoord"), "Wachtwoord");
    await user.click(await screen.findByRole("button", { name: "Inloggen" }));

    expect(navigate).toHaveBeenCalledWith("/account/setup");
  });

  test("Navigate to data entry when no account setup needed", async () => {
    render(<LoginForm />);

    overrideOnce("post", loginUrl, 200, {
      user_id: 33,
      username: "Invoerder01",
      role: "typist",
      fullname: "Al Ingesteld",
      needs_password_change: false,
    } satisfies LoginResponse);

    const user = userEvent.setup();

    await user.type(await screen.findByLabelText("Gebruikersnaam"), "Invoerder01");
    await user.type(await screen.findByLabelText("Wachtwoord"), "Wachtwoord");
    await user.click(await screen.findByRole("button", { name: "Inloggen" }));

    expect(navigate).toHaveBeenCalledWith("/elections");
  });
});
