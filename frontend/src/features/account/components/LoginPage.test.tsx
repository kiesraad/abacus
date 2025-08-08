import userEvent from "@testing-library/user-event";
import { describe, expect, test } from "vitest";

import { InitialisedHandler, LoginHandler } from "@/testing/api-mocks/RequestHandlers";
import { server } from "@/testing/server";
import { render, screen, spyOnHandler } from "@/testing/test-utils";

import { LoginPage } from "./LoginPage";

describe("LoginPage", () => {
  test("Enter form field values", async () => {
    server.use(InitialisedHandler, LoginHandler);
    const login = spyOnHandler(LoginHandler);

    render(<LoginPage />);

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
});
