import * as ReactRouter from "react-router";

import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";

import { AccountUpdateRequestHandler } from "@/testing/api-mocks/RequestHandlers";
import { loginResponseMockData } from "@/testing/api-mocks/UserMockData";
import { server } from "@/testing/server";
import { render, screen } from "@/testing/test-utils";

import { AccountSetupPage } from "./AccountSetupPage";

const navigate = vi.fn();
const setUser = vi.fn();

vi.mock("@/api/useApiState", async (importOriginal) => ({
  ...(await importOriginal()),
  useApiState: () => ({ user: {}, setUser }),
}));

describe("AccountSetupPage", () => {
  test("Update user in api state and navigate to data entry", async () => {
    server.use(AccountUpdateRequestHandler);
    vi.spyOn(ReactRouter, "useNavigate").mockImplementation(() => navigate);

    render(<AccountSetupPage />);

    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Jouw naam (roepnaam + achternaam)"), "First Last");
    await user.type(screen.getByLabelText("Kies nieuw wachtwoord"), "password*password");
    await user.type(screen.getByLabelText("Herhaal wachtwoord"), "password*password");

    const submitButton = screen.getByRole("button", { name: "Opslaan" });
    await user.click(submitButton);

    expect(navigate).toHaveBeenCalledWith("/elections#new-account");
    expect(setUser).toHaveBeenCalledWith(loginResponseMockData);
  });
});
