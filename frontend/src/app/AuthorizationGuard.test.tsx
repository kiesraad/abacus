import { render as rtlRender } from "@testing-library/react";
import { type RouteObject, RouterProvider } from "react-router";
import { within } from "storybook/test";
import { describe, expect, test, vi } from "vitest";
import { ApiClient } from "@/api/ApiClient";
import { ApiProviderContext, type ApiState } from "@/api/ApiProviderContext";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import { LoginForm } from "@/features/account/components/LoginForm";
import { TestUserProvider } from "@/testing/TestUserProvider";
import { expectForbiddenErrorPage, screen, setupTestRouter, waitFor } from "@/testing/test-utils";
import type { LoginResponse, Role } from "@/types/generated/openapi";
import { AuthorizationGuard } from "./AuthorizationGuard";

async function renderAuthorizationGuard({
  routes,
  initialPath,
  userRole = null,
  expiration,
}: {
  routes: RouteObject[];
  initialPath: string;
  userRole?: Role | null;
  expiration?: Date;
}) {
  const router = setupTestRouter(routes);
  await router.navigate(initialPath);

  rtlRender(
    <TestUserProvider userRole={userRole} overrideExpiration={expiration}>
      <RouterProvider router={router} />
    </TestUserProvider>,
  );

  return router;
}

async function renderAuthorizationGuardWithUser({
  routes,
  initialPath,
  user,
  expiration,
}: {
  routes: RouteObject[];
  initialPath: string;
  user: LoginResponse;
  expiration?: Date;
}) {
  const router = setupTestRouter(routes);
  await router.navigate(initialPath);

  const apiState: ApiState = {
    client: new ApiClient(),
    user,
    setUser: () => {},
    logout: async () => Promise.reject(new Error("Not implemented in test")),
    login: async () => Promise.reject(new Error("Not implemented in test")),
    loading: false,
    expiration: expiration ?? new Date(Date.now() + 1000 * 60 * 30),
    extendSession: async () => {},
    airGapError: false,
  };

  rtlRender(
    <ApiProviderContext.Provider value={apiState}>
      <RouterProvider router={router} />
    </ApiProviderContext.Provider>,
  );

  return router;
}

describe("AuthorizationGuard", () => {
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
    const router = await renderAuthorizationGuardWithUser({
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
});
