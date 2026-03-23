import { render as rtlRender } from "@testing-library/react";
import type { RouteObject } from "react-router";
import { RouterProvider } from "react-router";
import { describe, expect, test, vi } from "vitest";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import { LoginPage } from "@/features/account/components/LoginPage";
import { TestUserProvider } from "@/testing/TestUserProvider";
import { setupTestRouter } from "@/testing/test-utils";
import type { Role } from "@/types/generated/openapi";
import { RootLayout } from "./RootLayout";

const render = (routes: RouteObject[], userRole: Role | null = null) => {
  const router = setupTestRouter(routes);
  rtlRender(
    <TestUserProvider userRole={userRole}>
      <RouterProvider router={router} />
    </TestUserProvider>,
  );

  return router;
};

describe("Route authorisation is handled", () => {
  test.each([
    { handle: { public: true }, ownRole: null, allowed: true },
    { handle: { public: true }, ownRole: "typist_gsb", allowed: true },
    { handle: { roles: [] }, ownRole: null, allowed: false },
    { handle: { roles: [] }, ownRole: "typist_gsb", allowed: false },
    { handle: { roles: ["typist_gsb"] }, ownRole: "typist_gsb", allowed: true },
    { handle: { roles: ["typist_gsb"] }, ownRole: "coordinator_gsb", allowed: false },
    { handle: { roles: ["coordinator_gsb", "typist_gsb"] }, ownRole: "coordinator_gsb", allowed: true },
    { handle: { roles: ["administrator", "coordinator_gsb", "typist_gsb"] }, ownRole: "administrator", allowed: true },
  ] satisfies Array<{
    handle: RouteObject["handle"];
    ownRole: Role | null;
    allowed: boolean;
  }>)("$handle, ownRole=$ownRole, allowed=$allowed", ({ handle, ownRole, allowed }) => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    const router = render(
      [
        { path: "/", Component: RootLayout, errorElement: <ErrorBoundary />, handle },
        { path: "/account/login", Component: LoginPage, handle: { public: true } },
      ],
      ownRole,
    );

    expect(router.state.location.pathname).toEqual(allowed ? "/" : "/account/login");
    expect(router.state.location.state).toEqual(allowed ? null : { unauthorized: true });

    if (allowed) {
      expect(console.error).not.toHaveBeenCalled();
    } else {
      expect(console.error).toHaveBeenCalledWith(
        `Forbidden access to route / for ${ownRole ? `role ${ownRole}` : "unauthenticated user"}`,
      );
    }
  });
});
