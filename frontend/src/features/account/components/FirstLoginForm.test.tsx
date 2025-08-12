import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";

import { LoginHandler } from "@/testing/api-mocks/RequestHandlers";
import { overrideOnce, server } from "@/testing/server";
import { render, screen, spyOnHandler, within } from "@/testing/test-utils";

import { FirstLoginForm } from "./FirstLoginForm";

const prev = vi.fn();

describe("FirstLoginForm", () => {
  test("Login for the first time", async () => {
    server.use(LoginHandler);
    const login = spyOnHandler(LoginHandler);

    render(<FirstLoginForm prev={prev} />);

    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Gebruikersnaam"), "username");
    await user.type(screen.getByLabelText("Wachtwoord"), "password*password");

    const submitButton = screen.getByRole("button", { name: "Inloggen" });
    await user.click(submitButton);

    expect(login).toHaveBeenCalledWith({
      username: "username",
      password: "password*password",
    });
  });

  test("Login for the first time error", async () => {
    overrideOnce("post", "/api/user/login", 400, {
      error: "Invalid credentials",
      fatal: false,
    });

    render(<FirstLoginForm prev={prev} />);

    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Gebruikersnaam"), "username");
    await user.type(screen.getByLabelText("Wachtwoord"), "password*password");

    const submitButton = screen.getByRole("button", { name: "Inloggen" });
    await user.click(submitButton);

    const loginSuccess = await screen.findByRole("alert");
    expect(within(loginSuccess).getByRole("strong")).toHaveTextContent(
      "De gebruikersnaam of het wachtwoord is onjuist",
    );
  });
});
