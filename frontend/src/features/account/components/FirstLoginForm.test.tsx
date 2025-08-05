import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";

import { LoginHandler } from "@/testing/api-mocks/RequestHandlers";
import { server } from "@/testing/server";
import { render, screen, spyOnHandler } from "@/testing/test-utils";

import { FirstLoginForm } from "./FirstLoginForm";

const prev = vi.fn();

describe("FirstLoginForm", () => {
  test("Create the first admin user", async () => {
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
});
