import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";

import {
  AdminExistsRequestHandler,
  CreateFirstAdminRequestHandler,
  LoginHandler,
} from "@/testing/api-mocks/RequestHandlers";
import { server } from "@/testing/server";
import { render, screen } from "@/testing/test-utils";

import { InitialiseApplicationPage } from "./InitialiseApplicationPage";

const navigate = vi.fn();

vi.mock(import("react-router"), async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => navigate,
}));

describe("InitialiseApplicationPage", () => {
  test("Enter form field values", async () => {
    server.use(CreateFirstAdminRequestHandler, AdminExistsRequestHandler, LoginHandler);

    render(<InitialiseApplicationPage />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Welkom bij Abacus");

    const nextButton = screen.getByRole("button", { name: "Account voor beheerder aanmaken" });
    await userEvent.click(nextButton);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Account voor beheerder aanmaken");

    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Jouw naam (roepnaam + achternaam)"), "First Last");
    await user.type(screen.getByLabelText("Gebruikersnaam"), "firstlast");
    await user.type(screen.getByLabelText("Kies een wachtwoord"), "password*password");
    await user.type(screen.getByLabelText("Herhaal wachtwoord"), "password*password");

    const submitButton = screen.getByRole("button", { name: "Opslaan" });
    await user.click(submitButton);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Inloggen met account van beheerder");

    await user.type(screen.getByLabelText("Gebruikersnaam"), "username");
    await user.type(screen.getByLabelText("Wachtwoord"), "password*password");

    const loginButton = screen.getByRole("button", { name: "Inloggen" });
    await user.click(loginButton);

    expect(navigate).toHaveBeenCalledWith("/elections");
  });
});
