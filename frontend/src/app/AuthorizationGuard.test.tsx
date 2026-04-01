import { render as rtlRender } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { type ReactNode, useState } from "react";
import { type RouteObject, RouterProvider } from "react-router";
import { within } from "storybook/test";
import { describe, expect, test, vi } from "vitest";
import { ApiClient } from "@/api/ApiClient";
import { ApiProviderContext, type ApiState } from "@/api/ApiProviderContext";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import { LoginForm } from "@/features/account/components/LoginForm";
import { expectForbiddenErrorPage, screen, setupTestRouter, waitFor } from "@/testing/test-utils";
import type { LoginResponse, Role } from "@/types/generated/openapi";
import { AuthorizationGuard } from "./AuthorizationGuard";
import { EXPIRATION_DIALOG_SECONDS } from "./authorizationConstants";

async function renderAuthorizationGuard({
  routes,
  initialPath,
  userRole = null,
  user,
  expiration,
  loading = false,
  setUser = () => {},
  extendSession = async () => {},
}: {
  routes: RouteObject[];
  initialPath: string;
  userRole?: Role | null;
  user?: LoginResponse | null;
  expiration?: Date;
  loading?: boolean;
  setUser?: ApiState["setUser"];
  extendSession?: ApiState["extendSession"];
}) {
  const router = setupTestRouter(routes);
  await router.navigate(initialPath);

  const resolvedUser =
    user ??
    (userRole
      ? {
          user_id: 1,
          username: "test",
          role: userRole,
          fullname: "Test User",
          needs_password_change: false,
        }
      : null);

  rtlRender(
    <TestApiProvider
      expiration={expiration ?? new Date(Date.now() + 1000 * 60 * 30)}
      extendSession={extendSession}
      loading={loading}
      setUser={setUser}
      user={resolvedUser}
    >
      <RouterProvider router={router} />
    </TestApiProvider>,
  );

  return router;
}

function TestApiProvider({
  children,
  expiration,
  extendSession,
  loading,
  setUser,
  user,
}: {
  children: ReactNode;
  expiration: Date;
  extendSession: ApiState["extendSession"];
  loading: boolean;
  setUser: ApiState["setUser"];
  user: LoginResponse | null;
}) {
  const [client] = useState(() => new ApiClient());
  const [currentUser, setCurrentUser] = useState<LoginResponse | null>(user);
  const [currentExpiration, setCurrentExpiration] = useState<Date | null>(expiration);

  const apiState: ApiState = {
    client,
    user: currentUser,
    setUser: (nextUser) => {
      setCurrentUser(nextUser);
      setUser(nextUser);
    },
    logout: async () => Promise.reject(new Error("Not implemented in test")),
    login: async () => Promise.reject(new Error("Not implemented in test")),
    loading,
    expiration: currentExpiration,
    extendSession: async () => {
      await extendSession();
      setCurrentExpiration(new Date(Date.now() + 1000 * 60 * 30));
    },
    airGapError: false,
  };

  return <ApiProviderContext.Provider value={apiState}>{children}</ApiProviderContext.Provider>;
}

describe("AuthorizationGuard", () => {
  test("does not show the session dialog when the session is still valid", async () => {
    await renderAuthorizationGuard({
      initialPath: "/logs",
      userRole: "administrator",
      expiration: new Date(Date.now() + 1000 * (EXPIRATION_DIALOG_SECONDS + 1)),
      routes: [
        {
          path: "/logs",
          element: (
            <AuthorizationGuard>
              <div>Protected content</div>
            </AuthorizationGuard>
          ),
          handle: { roles: ["administrator"] },
        },
      ],
    });

    expect(screen.queryByTestId("modal-title")).not.toBeInTheDocument();
  });

  test("shows the session dialog on short session lifetime", async () => {
    await renderAuthorizationGuard({
      initialPath: "/logs",
      userRole: "administrator",
      expiration: new Date(Date.now() + 1000 * (EXPIRATION_DIALOG_SECONDS - 1)),
      routes: [
        {
          path: "/logs",
          element: (
            <AuthorizationGuard>
              <div>Protected content</div>
            </AuthorizationGuard>
          ),
          handle: { roles: ["administrator"] },
        },
      ],
    });

    expect(await screen.findByTestId("modal-title")).toHaveTextContent("Je wordt bijna uitgelogd");
  });

  test("does not show the session dialog when the user is not logged in", async () => {
    await renderAuthorizationGuard({
      initialPath: "/account/login",
      userRole: null,
      expiration: new Date(Date.now() + 1000 * (EXPIRATION_DIALOG_SECONDS - 1)),
      routes: [
        {
          path: "/account/login",
          element: (
            <AuthorizationGuard>
              <div>Login page</div>
            </AuthorizationGuard>
          ),
          handle: { public: true },
        },
      ],
    });

    expect(screen.getByText("Login page")).toBeVisible();
    expect(screen.queryByTestId("modal-title")).not.toBeInTheDocument();
  });

  test("renders children for an authorized user", async () => {
    await renderAuthorizationGuard({
      initialPath: "/logs",
      userRole: "administrator",
      routes: [
        {
          path: "/logs",
          element: (
            <AuthorizationGuard>
              <div>Protected content</div>
            </AuthorizationGuard>
          ),
          handle: { roles: ["administrator"] },
        },
      ],
    });

    expect(screen.getByText("Protected content")).toBeVisible();
  });

  test("extends the session and hides the dialog when the user chooses to stay logged in", async () => {
    const extendSession = vi.fn().mockResolvedValue(undefined);

    await renderAuthorizationGuard({
      initialPath: "/logs",
      userRole: "administrator",
      expiration: new Date(Date.now() + 1000 * (EXPIRATION_DIALOG_SECONDS - 1)),
      extendSession,
      routes: [
        {
          path: "/logs",
          element: (
            <AuthorizationGuard>
              <div>Protected content</div>
            </AuthorizationGuard>
          ),
          handle: { roles: ["administrator"] },
        },
      ],
    });

    await userEvent.click(await screen.findByRole("button", { name: "Blijf ingelogd" }));

    await waitFor(() => {
      expect(screen.queryByTestId("modal-title")).not.toBeInTheDocument();
    });
    expect(extendSession).toHaveBeenCalledTimes(1);
  });

  test("redirects an unauthenticated user to the login page", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    const router = await renderAuthorizationGuard({
      initialPath: "/logs",
      routes: [
        {
          path: "/logs",
          element: (
            <AuthorizationGuard>
              <div>Protected content</div>
            </AuthorizationGuard>
          ),
          handle: { roles: ["administrator"] },
        },
        { path: "/account/login", element: <div>Login page</div>, handle: { public: true } },
      ],
    });

    expect(router.state.location.pathname).toBe("/account/login");
    expect(router.state.location.state).toEqual({ unauthorized: true });
    expect(console.error).toHaveBeenCalledWith("Forbidden access to route /logs for unauthenticated user");
  });

  test("shows an error for an authenticated user with the wrong role", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    await renderAuthorizationGuard({
      initialPath: "/logs",
      userRole: "typist_gsb",
      routes: [
        {
          path: "/logs",
          errorElement: <ErrorBoundary />,
          element: (
            <AuthorizationGuard>
              <div>Protected content</div>
            </AuthorizationGuard>
          ),
          handle: { roles: ["administrator"] },
        },
        { path: "/account/login", element: <div>Login page</div>, handle: { public: true } },
      ],
    });

    await expectForbiddenErrorPage();
    expect(console.error).toHaveBeenCalledWith("Forbidden access to route /logs for role typist_gsb");
  });

  test("redirects to the login page when the session has expired", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    const router = await renderAuthorizationGuard({
      initialPath: "/logs",
      userRole: "administrator",
      expiration: new Date(Date.now() - 1000),
      routes: [
        {
          path: "/logs",
          element: (
            <AuthorizationGuard>
              <div>Protected content</div>
            </AuthorizationGuard>
          ),
          handle: { roles: ["administrator"] },
        },
        { path: "/account/login", element: <LoginForm />, handle: { public: true } },
      ],
    });

    await waitFor(async () => {
      expect(router.state.location.pathname).toBe("/account/login");
      expect(router.state.location.state).toEqual({ unauthorized: true });

      const logoutText = within(await screen.findByRole("alert")).getByRole("strong");
      expect(logoutText).toHaveTextContent("Je bent automatisch uitgelogd");
      expect(logoutText).toBeVisible();
      expect(console.error).toHaveBeenCalledWith("Forbidden access to route /logs for unauthenticated user");
    });
  });

  test("redirects a logged-in user from the login page to /elections", async () => {
    const router = await renderAuthorizationGuard({
      initialPath: "/account/login",
      userRole: "administrator",
      routes: [
        {
          path: "/account/login",
          element: (
            <AuthorizationGuard>
              <div>Login page</div>
            </AuthorizationGuard>
          ),
          handle: { public: true },
        },
        { path: "/elections", element: <div>Elections overview</div>, handle: { public: true } },
      ],
    });

    expect(router.state.location.pathname).toBe("/elections");
    expect(screen.getByText("Elections overview")).toBeVisible();
  });

  test("redirects a first-login user from the login page to /account/setup", async () => {
    const router = await renderAuthorizationGuard({
      initialPath: "/account/login",
      user: {
        user_id: 1,
        username: "test",
        role: "administrator",
        fullname: "",
        needs_password_change: true,
      },
      routes: [
        {
          path: "/account/login",
          element: (
            <AuthorizationGuard>
              <div>Login page</div>
            </AuthorizationGuard>
          ),
          handle: { public: true },
        },
        {
          path: "/account/setup",
          element: <div>Account setup</div>,
          handle: { roles: ["administrator"] },
        },
      ],
    });

    expect(router.state.location.pathname).toBe("/account/setup");
    expect(screen.getByText("Account setup")).toBeVisible();
  });

  test("redirects a first-login user from the elections page to /account/setup", async () => {
    const router = await renderAuthorizationGuard({
      initialPath: "/elections",
      user: {
        user_id: 1,
        username: "test",
        role: "administrator",
        fullname: "",
        needs_password_change: true,
      },
      routes: [
        {
          path: "/elections",
          element: (
            <AuthorizationGuard>
              <div>Elections overview page</div>
            </AuthorizationGuard>
          ),
          handle: { public: true },
        },
        {
          path: "/account/setup",
          element: <div>Account setup</div>,
          handle: { roles: ["administrator"] },
        },
      ],
    });

    expect(router.state.location.pathname).toBe("/account/setup");
    expect(screen.getByText("Account setup")).toBeVisible();
  });

  test("a first-login user can access /account/logout", async () => {
    const router = await renderAuthorizationGuard({
      initialPath: "/account/logout",
      user: {
        user_id: 1,
        username: "test",
        role: "administrator",
        fullname: "",
        needs_password_change: true,
      },
      routes: [
        {
          path: "/account/logout",
          element: (
            <AuthorizationGuard>
              <div>Elections overview page</div>
            </AuthorizationGuard>
          ),
          handle: { public: true },
        },
      ],
    });

    expect(router.state.location.pathname).toBe("/account/logout");
  });
});
