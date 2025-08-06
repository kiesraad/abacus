import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";

import { CreateFirstAdminRequestHandler } from "@/testing/api-mocks/RequestHandlers";
import { overrideOnce, server } from "@/testing/server";
import { render, screen, spyOnHandler } from "@/testing/test-utils";

import { CreateFirstAdminForm } from "./CreateFirstAdminForm";

const next = vi.fn();

describe("CreateFirstAdminForm", () => {
  test("Create the first admin user", async () => {
    server.use(CreateFirstAdminRequestHandler);
    const createAdmin = spyOnHandler(CreateFirstAdminRequestHandler);

    render(<CreateFirstAdminForm next={next} />);

    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Jouw naam (roepnaam + achternaam)"), "First Last");
    await user.type(screen.getByLabelText("Gebruikersnaam"), "firstlast");
    await user.type(screen.getByLabelText("Kies een wachtwoord"), "password*password");
    await user.type(screen.getByLabelText("Herhaal wachtwoord"), "password*password");

    const submitButton = screen.getByRole("button", { name: "Opslaan" });
    await user.click(submitButton);

    expect(createAdmin).toHaveBeenCalledWith({
      username: "firstlast",
      fullname: "First Last",
      temp_password: "password*password",
      role: "administrator",
    });
    expect(next).toHaveBeenCalledOnce();
  });

  test("Create the first admin user form errors", async () => {
    render(<CreateFirstAdminForm next={next} />);

    // error on empty fields
    const user = userEvent.setup();
    const submitButton = screen.getByRole("button", { name: "Opslaan" });
    await user.click(submitButton);

    expect(screen.getByTestId("username-hint_or_error")).toHaveTextContent("Dit veld mag niet leeg zijn");
  });

  test("Create the first admin user form password errors", async () => {
    // error on invalid password
    overrideOnce("post", "/api/initialise/first-admin", 400, {
      error: "Invalid password",
      fatal: false,
      reference: "PasswordRejection",
    });

    render(<CreateFirstAdminForm next={next} />);

    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Jouw naam (roepnaam + achternaam)"), "First Last");
    await user.type(screen.getByLabelText("Gebruikersnaam"), "firstlast");
    await user.type(screen.getByLabelText("Kies een wachtwoord"), "password");
    await user.type(screen.getByLabelText("Herhaal wachtwoord"), "password");
    const submitButton = screen.getByRole("button", { name: "Opslaan" });
    await user.click(submitButton);

    expect(screen.getByTestId("password-hint_or_error")).toHaveTextContent("Gebruik minimaal 13 karakters.");

    // error on password repeat mismatch
    await user.type(screen.getByLabelText("Kies een wachtwoord"), "password1");
    await user.type(screen.getByLabelText("Herhaal wachtwoord"), "password2");
    await user.click(submitButton);

    expect(screen.getByTestId("password_repeat-hint_or_error")).toHaveTextContent("De wachtwoorden komen niet overeen");
  });

  test("Create the first admin user api error", async () => {
    render(<CreateFirstAdminForm next={next} />);

    overrideOnce("post", "/api/initialise/first-admin", 400, {
      error: "Some error occurred",
      fatal: false,
      reference: "SomeError",
    });

    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Jouw naam (roepnaam + achternaam)"), "First Last");
    await user.type(screen.getByLabelText("Gebruikersnaam"), "firstlast");
    await user.type(screen.getByLabelText("Kies een wachtwoord"), "password*password");
    await user.type(screen.getByLabelText("Herhaal wachtwoord"), "password*password");
    const submitButton = screen.getByRole("button", { name: "Opslaan" });

    await user.click(submitButton);
    expect(screen.getByRole("alert")).toHaveTextContent("Some error occurred");
  });
});
