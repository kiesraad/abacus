import userEvent from "@testing-library/user-event";
import * as ReactRouter from "react-router";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { LoginHandler } from "@/testing/api-mocks/RequestHandlers";
import { overrideOnce, server } from "@/testing/server";
import { render, screen, spyOnHandler, within } from "@/testing/test-utils";

import { FirstLoginForm } from "./FirstLoginForm";

const prev = vi.fn();
const navigate = vi.fn();

describe("FirstLoginForm", () => {
  beforeEach(() => {
    vi.spyOn(ReactRouter, "useNavigate").mockImplementation(() => navigate);
  });

  test("Login for the first time", async () => {
    server.use(LoginHandler);
    const login = spyOnHandler(LoginHandler);

    render(<FirstLoginForm prev={prev} />);

    const user = userEvent.setup();
    await user.type(screen.getByRole("textbox", { name: "Gebruikersnaam" }), "username");
    await user.type(screen.getByLabelText("Wachtwoord"), "password*password");

    const submitButton = screen.getByRole("button", { name: "Inloggen" });
    await user.click(submitButton);

    expect(login).toHaveBeenCalledWith({
      username: "username",
      password: "password*password",
    });
    expect(navigate).toHaveBeenCalledWith("/elections");
  });

  test("Login for the first time with invalid credentials", async () => {
    overrideOnce("post", "/api/login", 401, {
      error: "Invalid username and/or password",
      fatal: false,
      reference: "InvalidUsernameOrPassword",
    });

    render(<FirstLoginForm prev={prev} />);

    const user = userEvent.setup();
    await user.type(screen.getByRole("textbox", { name: "Gebruikersnaam" }), "username");
    await user.type(screen.getByLabelText("Wachtwoord"), "password*password");

    const submitButton = screen.getByRole("button", { name: "Inloggen" });
    await user.click(submitButton);

    const alert = await screen.findByRole("alert");
    expect(within(alert).getByRole("strong")).toHaveTextContent("De gebruikersnaam of het wachtwoord is onjuist");
    expect(navigate).not.toHaveBeenCalled();
  });

  test("Login for the first time with too many login attempts, and retry manually", async () => {
    overrideOnce("post", "/api/login", 429, {
      error: "Too many login attempts",
      fatal: false,
      reference: "LoginRateLimited",
    });

    render(<FirstLoginForm prev={prev} />);

    const user = userEvent.setup();
    await user.type(screen.getByRole("textbox", { name: "Gebruikersnaam" }), "username");
    await user.type(screen.getByLabelText("Wachtwoord"), "password*password");
    await user.click(screen.getByRole("button", { name: "Inloggen" }));

    const alert = await screen.findByRole("alert");
    expect(within(alert).getByRole("strong")).toHaveTextContent(
      "Te veel inlogpogingen. Wacht even voordat je opnieuw probeert in te loggen.",
    );
    expect(screen.queryByText("De gebruikersnaam of het wachtwoord is onjuist")).not.toBeInTheDocument();
    expect(navigate).not.toHaveBeenCalled();

    // The user can try again with the same credentials
    server.use(LoginHandler);
    await user.click(screen.getByRole("button", { name: "Inloggen" }));

    expect(navigate).toHaveBeenCalledWith("/elections");
  });
});
