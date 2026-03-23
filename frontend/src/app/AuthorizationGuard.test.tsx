import { render as rtlRender } from "@testing-library/react";
import { type RouteObject, RouterProvider } from "react-router";
import { describe, expect, test, vi } from "vitest";

import { TestUserProvider } from "@/testing/TestUserProvider";
import { screen, setupTestRouter, waitFor } from "@/testing/test-utils";
import type { Role } from "@/types/generated/openapi";
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

  test("redirects an unauthorized user to the login page", async () => {
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
        { path: "/account/login", element: <div>Login page</div>, handle: { public: true } },
      ],
    });

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/account/login");
      expect(router.state.location.state).toEqual({ unauthorized: true });
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
});
