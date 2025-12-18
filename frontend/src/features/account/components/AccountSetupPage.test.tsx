import * as ReactRouter from "react-router";

import { render as rtlRender } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";

import * as useApiState from "@/api/useApiState";
import { ApiState } from "@/api/ApiProviderContext";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import { AccountUpdateRequestHandler } from "@/testing/api-mocks/RequestHandlers";
import { loginResponseMockData } from "@/testing/api-mocks/UserMockData";
import { Providers } from "@/testing/Providers";
import { server } from "@/testing/server";
import { expectConflictErrorPage, render, screen, setupTestRouter } from "@/testing/test-utils";
import { LoginResponse } from "@/types/generated/openapi";

import { accountRoutes } from "../routes";
import { AccountSetupPage } from "./AccountSetupPage";

const navigate = vi.fn();
const setUser = vi.fn();

describe("AccountSetupPage", () => {
  test("Update user in api state and navigate to data entry", async () => {
    server.use(AccountUpdateRequestHandler);
    vi.spyOn(ReactRouter, "Navigate").mockImplementation((props) => {
      navigate(props.to);
      return null;
    });
    vi.spyOn(useApiState, "useApiState").mockReturnValue({
      user: {} as Partial<LoginResponse>,
      setUser,
    } as Partial<ApiState> as ApiState);

    render(<AccountSetupPage />);

    const user = userEvent.setup();
    await user.type(screen.getByRole("textbox", { name: "Jouw naam (roepnaam + achternaam)" }), "First Last");
    await user.type(screen.getByLabelText("Kies nieuw wachtwoord"), "password*password");
    await user.type(screen.getByLabelText("Herhaal wachtwoord"), "password*password");

    const submitButton = screen.getByRole("button", { name: "Opslaan" });
    await user.click(submitButton);

    expect(navigate).toHaveBeenCalledWith("/elections#new-account");
    expect(setUser).toHaveBeenCalledWith(loginResponseMockData);
  });

  test("Redirect to login page when user is not set", () => {
    vi.spyOn(ReactRouter, "Navigate").mockImplementation((props) => {
      navigate(props.to, props.state);
      return null;
    });
    vi.spyOn(useApiState, "useApiState").mockReturnValue({
      user: null,
      setUser,
    } as Partial<ApiState> as ApiState);

    render(<AccountSetupPage />);

    expect(navigate).toHaveBeenCalledWith("/account/login", { unauthorized: true });
  });

  test("Shows error page with forbidden message when user is not incomplete", async () => {
    // error is expected
    vi.spyOn(console, "error").mockImplementation(() => {});
    const router = setupTestRouter([
      {
        Component: null,
        errorElement: <ErrorBoundary />,
        children: [{ path: "account", children: accountRoutes }],
      },
    ]);

    vi.spyOn(useApiState, "useApiState").mockReturnValue({
      user: { fullname: "Full Name", needs_password_change: false, role: "typist" } as Partial<LoginResponse>,
      setUser,
    } as Partial<ApiState> as ApiState);

    await router.navigate("/account/setup");

    rtlRender(<Providers router={router} />);

    await expectConflictErrorPage();
    expect(console.error).toHaveBeenCalled();
  });
});
