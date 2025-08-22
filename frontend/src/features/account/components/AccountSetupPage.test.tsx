import * as ReactRouter from "react-router";

import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";

import * as useApiState from "@/api/useApiState";
import { ApiState } from "@/api/ApiProviderContext";
import { AccountUpdateRequestHandler } from "@/testing/api-mocks/RequestHandlers";
import { loginResponseMockData } from "@/testing/api-mocks/UserMockData";
import { server } from "@/testing/server";
import { render, screen } from "@/testing/test-utils";
import { LoginResponse } from "@/types/generated/openapi";

import { AccountSetupPage } from "./AccountSetupPage";

const navigate = vi.fn();
const setUser = vi.fn();

describe("AccountSetupPage", () => {
  test("Update user in api state and navigate to data entry", async () => {
    server.use(AccountUpdateRequestHandler);
    vi.spyOn(ReactRouter, "useNavigate").mockImplementation(() => navigate);
    vi.spyOn(useApiState, "useApiState").mockReturnValue({
      user: {} as Partial<LoginResponse>,
      setUser,
    } as Partial<ApiState> as ApiState);

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
