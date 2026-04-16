import { render as rtlRender } from "@testing-library/react";
import type { RouteObject } from "react-router";
import { RouterProvider } from "react-router";
import { describe, expect, test, vi } from "vitest";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import { LoginPage } from "@/features/account/components/LoginPage";
import { InitialisedHandler } from "@/testing/api-mocks/RequestHandlers";
import { server } from "@/testing/server";
import { TestUserProvider } from "@/testing/TestUserProvider";
import { expectForbiddenErrorPage, setupTestRouter } from "@/testing/test-utils";
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
  }>)("$handle, ownRole=$ownRole, allowed=$allowed", async ({ handle, ownRole, allowed }) => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    server.use(InitialisedHandler);

    const router = render(
      [
        { path: "/", Component: RootLayout, errorElement: <ErrorBoundary />, handle },
        { path: "/account/login", Component: LoginPage, handle: { public: true } },
      ],
      ownRole,
    );

    if (allowed) {
      expect(router.state.location.pathname).toEqual("/");
      expect(console.error).not.toHaveBeenCalled();
    } else if (ownRole === null) {
      // Expect redirect to login when not authenticated
      expect(router.state.location.pathname).toEqual("/account/login");
      expect(router.state.location.state).toEqual({ unauthorized: true });
    } else {
      // Expect forbidden error when authenticated but not authorized
      await expectForbiddenErrorPage();
      expect(console.error).toHaveBeenCalledWith(`Forbidden access to route / for role ${ownRole}`);
    }
  });
});
