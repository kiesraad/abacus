import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { CreateFirstAdminRequestHandler } from "@/testing/api-mocks/RequestHandlers";
import { overrideOnce, server } from "@/testing/server";
import { render, screen, spyOnHandler } from "@/testing/test-utils";
import type { CREATE_FIRST_ADMIN_REQUEST_PATH } from "@/types/generated/openapi";
import { CreateFirstAdminForm } from "./CreateFirstAdminForm";

const next = vi.fn();

describe("CreateFirstAdminForm", () => {
  beforeEach(() => {
    server.use(CreateFirstAdminRequestHandler);
  });

  test("Create the first admin user", async () => {
    const createAdmin = spyOnHandler(CreateFirstAdminRequestHandler);
    render(<CreateFirstAdminForm next={next} />);

    const user = userEvent.setup();
    await user.type(screen.getByRole("textbox", { name: "Jouw naam (roepnaam + achternaam)" }), "First Last");
    await user.type(screen.getByRole("textbox", { name: "Kies een gebruikersnaam" }), "firstlast");
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

  describe("Validation", () => {
    test("Required fields", async () => {
      const createAdmin = spyOnHandler(CreateFirstAdminRequestHandler);
      render(<CreateFirstAdminForm next={next} />);

      const user = userEvent.setup();
      const submitButton = screen.getByRole("button", { name: "Opslaan" });
      await user.click(submitButton);

      const fullnameInput = screen.getByRole("textbox", { name: "Jouw naam (roepnaam + achternaam)" });
      expect(fullnameInput).toBeInvalid();
      expect(fullnameInput).toHaveAccessibleErrorMessage("Dit veld mag niet leeg zijn");

      const usernameInput = screen.getByRole("textbox", { name: "Kies een gebruikersnaam" });
      expect(usernameInput).toBeInvalid();
      expect(usernameInput).toHaveAccessibleErrorMessage("Dit veld mag niet leeg zijn");

      const passwordInput = screen.getByLabelText("Kies een wachtwoord");
      expect(passwordInput).toBeInvalid();
      expect(passwordInput).toHaveAccessibleErrorMessage("Gebruik minimaal 13 karakters");

      expect(createAdmin).not.toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });

    test("Password mismatch", async () => {
      const createAdmin = spyOnHandler(CreateFirstAdminRequestHandler);
      render(<CreateFirstAdminForm next={next} />);

      const user = userEvent.setup();
      await user.type(screen.getByRole("textbox", { name: "Jouw naam (roepnaam + achternaam)" }), "First Last");
      await user.type(screen.getByRole("textbox", { name: "Kies een gebruikersnaam" }), "Invoerder0123");
      await user.type(screen.getByLabelText("Kies een wachtwoord"), "password*password");

      const passwordRepeat = screen.getByLabelText("Herhaal wachtwoord");
      await user.type(passwordRepeat, "something_else");

      const submitButton = screen.getByRole("button", { name: "Opslaan" });
      await user.click(submitButton);

      expect(passwordRepeat).toBeInvalid();
      expect(passwordRepeat).toHaveAccessibleErrorMessage("De wachtwoorden komen niet overeen");

      expect(createAdmin).not.toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe("API error handling", () => {
    test("Create the first admin user api error", async () => {
      render(<CreateFirstAdminForm next={next} />);
      const user = userEvent.setup();
      overrideOnce("post", "/api/initialise/first-admin" satisfies CREATE_FIRST_ADMIN_REQUEST_PATH, 400, {
        error: "Application already initialised",
        fatal: false,
        reference: "AlreadyInitialised",
      });

      await user.type(screen.getByRole("textbox", { name: "Jouw naam (roepnaam + achternaam)" }), "First Last");
      await user.type(screen.getByRole("textbox", { name: "Kies een gebruikersnaam" }), "firstlast");
      await user.type(screen.getByLabelText("Kies een wachtwoord"), "password*password");
      await user.type(screen.getByLabelText("Herhaal wachtwoord"), "password*password");
      const saveButton = screen.getByRole("button", { name: "Opslaan" });
      await user.click(saveButton);

      expect(await screen.findByRole("alert")).toHaveTextContent(
        "De applicatie is al geconfigureerd. Je kan geen nieuwe beheerder aanmaken.",
      );
    });

    test.each([
      {
        error: "PasswordRejectionSameAsOld",
        expectedErrorMessage: "Het nieuwe wachtwoord mag niet gelijk zijn aan het oude wachtwoord.",
      },
      {
        error: "PasswordRejectionSameAsUsername",
        expectedErrorMessage: "Het wachtwoord mag niet gelijk zijn aan de gebruikersnaam.",
      },
      {
        error: "PasswordRejectionTooShort",
        expectedErrorMessage: "Het wachtwoord moet minimaal 13 karakters lang zijn.",
      },
    ])("shows expected error message for $error", async ({ error, expectedErrorMessage }) => {
      render(<CreateFirstAdminForm next={next} />);
      const user = userEvent.setup();
      overrideOnce("post", "/api/initialise/first-admin" satisfies CREATE_FIRST_ADMIN_REQUEST_PATH, 400, {
        error: "Invalid password",
        fatal: false,
        reference: error,
      });

      await user.type(screen.getByRole("textbox", { name: "Jouw naam (roepnaam + achternaam)" }), "First Last");
      await user.type(screen.getByRole("textbox", { name: "Kies een gebruikersnaam" }), "Administrator");
      const password = screen.getByLabelText("Kies een wachtwoord");
      await user.type(password, "password*password");
      await user.type(screen.getByLabelText("Herhaal wachtwoord"), "password*password");

      const submitButton = screen.getByRole("button", { name: "Opslaan" });
      await user.click(submitButton);

      expect(password).toBeInvalid();
      expect(password).toHaveAccessibleErrorMessage(
        `Het opgegeven wachtwoord voldoet niet aan de eisen. ${expectedErrorMessage}`,
      );
    });
  });
});
