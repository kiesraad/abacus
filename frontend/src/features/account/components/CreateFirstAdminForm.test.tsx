import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";

import { CreateFirstAdminRequestHandler } from "@/testing/api-mocks/RequestHandlers";
import { overrideOnce, server } from "@/testing/server";
import { render, screen, spyOnHandler, waitFor } from "@/testing/test-utils";

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

    const fullnameInput = screen.getByLabelText("Jouw naam (roepnaam + achternaam)");
    expect(fullnameInput).toBeInvalid();
    expect(fullnameInput).toHaveAccessibleErrorMessage("Dit veld mag niet leeg zijn");

    const usernameInput = screen.getByLabelText("Gebruikersnaam");
    expect(usernameInput).toBeInvalid();
    expect(usernameInput).toHaveAccessibleErrorMessage("Dit veld mag niet leeg zijn");

    const passwordInput = screen.getByLabelText("Kies een wachtwoord");
    expect(passwordInput).toBeInvalid();
    expect(passwordInput).toHaveAccessibleErrorMessage("Het wachtwoord moet minimaal 13 karakters lang zijn.");
  });

  test("Create the first admin user form password errors", async () => {
    // error on invalid password
    overrideOnce("post", "/api/initialise/first-admin", 400, {
      error: "Invalid password",
      fatal: false,
      reference: "PasswordRejection",
    });

    render(<CreateFirstAdminForm next={next} />);

    const passwordInput = screen.getByLabelText("Kies een wachtwoord");
    const passwordRepeatInput = screen.getByLabelText("Herhaal wachtwoord");

    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Jouw naam (roepnaam + achternaam)"), "First Last");
    await user.type(screen.getByLabelText("Gebruikersnaam"), "firstlast");
    await user.type(passwordInput, "password");
    await user.type(passwordRepeatInput, "password");
    const submitButton = screen.getByRole("button", { name: "Opslaan" });
    await user.click(submitButton);

    await waitFor(() => {
      expect(passwordInput).toBeInvalid();
    });

    expect(passwordInput).toHaveAccessibleErrorMessage("Het wachtwoord moet minimaal 13 karakters lang zijn.");

    // error on password repeat mismatch
    await user.type(passwordInput, "password1");
    await user.type(passwordRepeatInput, "password2");
    await user.click(submitButton);

    expect(passwordRepeatInput).toHaveAccessibleErrorMessage("De wachtwoorden komen niet overeen");
  });

  test("Create the first admin user api error", async () => {
    render(<CreateFirstAdminForm next={next} />);

    overrideOnce("post", "/api/initialise/first-admin", 400, {
      error: "Application already initialised",
      fatal: false,
      reference: "AlreadyInitialised",
    });

    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Jouw naam (roepnaam + achternaam)"), "First Last");
    await user.type(screen.getByLabelText("Gebruikersnaam"), "firstlast");
    await user.type(screen.getByLabelText("Kies een wachtwoord"), "password*password");
    await user.type(screen.getByLabelText("Herhaal wachtwoord"), "password*password");
    const submitButton = screen.getByRole("button", { name: "Opslaan" });

    await user.click(submitButton);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "De applicatie is al geconfigureerd. Je kan geen nieuwe beheerder aanmaken.",
    );
  });
});
