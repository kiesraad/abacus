import * as ReactRouter from "react-router";

import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

import {
  AdminExistsRequestHandler,
  CreateFirstAdminRequestHandler,
  LoginHandler,
} from "@/testing/api-mocks/RequestHandlers";
import { overrideOnce, server } from "@/testing/server";
import { render, screen, waitFor } from "@/testing/test-utils";

import { InitialiseApplicationPage } from "./InitialiseApplicationPage";

const navigate = vi.fn();

describe("InitialiseApplicationPage", () => {
  beforeEach(() => {
    vi.spyOn(ReactRouter, "useNavigate").mockImplementation(() => navigate);
  });

  test("Enter form field values", async () => {
    server.use(CreateFirstAdminRequestHandler, AdminExistsRequestHandler, LoginHandler);

    render(<InitialiseApplicationPage />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Welkom bij Abacus");
    });

    const nextButton = screen.getByRole("button", { name: "Account voor beheerder aanmaken" });
    await userEvent.click(nextButton);

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Account voor beheerder aanmaken");
    });

    const user = userEvent.setup();
    await user.type(screen.getByRole("textbox", { name: "Jouw naam (roepnaam + achternaam)" }), "First Last");
    await user.type(screen.getByRole("textbox", { name: "Kies een gebruikersnaam" }), "firstlast");
    await user.type(screen.getByLabelText("Kies een wachtwoord"), "password*password");
    await user.type(screen.getByLabelText("Herhaal wachtwoord"), "password*password");

    const submitButton = screen.getByRole("button", { name: "Opslaan" });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Inloggen met account van beheerder");
    });

    const back = screen.getByText("Stel het account van de beheerder opnieuw in.");
    await user.click(back);

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Account voor beheerder aanmaken");
    });

    await user.type(screen.getByRole("textbox", { name: "Jouw naam (roepnaam + achternaam)" }), "First Last");
    await user.type(screen.getByRole("textbox", { name: "Kies een gebruikersnaam" }), "firstlast");
    await user.type(screen.getByLabelText("Kies een wachtwoord"), "password*password");
    await user.type(screen.getByLabelText("Herhaal wachtwoord"), "password*password");

    const submitButton2 = screen.getByRole("button", { name: "Opslaan" });
    await user.click(submitButton2);

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Inloggen met account van beheerder");
    });

    await user.type(screen.getByRole("textbox", { name: "Gebruikersnaam" }), "username");
    await user.type(screen.getByLabelText("Wachtwoord"), "password*password");

    const loginButton = screen.getByRole("button", { name: "Inloggen" });
    await user.click(loginButton);

    expect(navigate).toHaveBeenCalledWith("/elections");
  });

  test("Go to login if an account was already created", async () => {
    overrideOnce("get", "/api/initialise/admin-exists", 204, "");

    render(<InitialiseApplicationPage />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Inloggen met account van beheerder");
    });
  });
});
