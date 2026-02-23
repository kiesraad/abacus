import { render as rtlRender } from "@testing-library/react";
import type { RouteObject } from "react-router";
import { describe, expect, test, vi } from "vitest";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import { LoginPage } from "@/features/account/components/LoginPage";
import type { UseUserReturn } from "@/hooks/user/useUser";
import * as useUser from "@/hooks/user/useUser";
import { Providers } from "@/testing/Providers";
import { setupTestRouter } from "@/testing/test-utils";
import * as userMockData from "@/testing/user-mock-data";
import type { Role } from "@/types/generated/openapi";
import { RootLayout } from "./RootLayout";

const render = (routes: RouteObject[]) => {
  const router = setupTestRouter(routes);
  rtlRender(<Providers router={router} />);

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

    if (ownRole) {
      let user: UseUserReturn | null = null;
      switch (ownRole) {
        case "administrator":
          user = userMockData.getAdminUser();
          break;
        case "coordinator_gsb":
          user = userMockData.getCoordinatorUser();
          break;
        case "typist_gsb":
          user = userMockData.getTypistUser();
          break;
      }

      vi.spyOn(useUser, "useUser").mockReturnValue(user);
    }

    const router = render([
      { path: "/", Component: RootLayout, errorElement: <ErrorBoundary />, handle },
      { path: "/account/login", Component: LoginPage, handle: { public: true } },
    ]);

    expect(router.state.location.pathname).toEqual(allowed ? "/" : "/account/login");
    expect(router.state.location.state).toEqual(allowed ? null : { unauthorized: true });

    expect(console.error).toHaveBeenCalledTimes(allowed ? 0 : 1);
    if (!allowed) {
      expect(console.error).toHaveBeenCalledWith(
        `Forbidden access to route / for ${ownRole ? `role ${ownRole}` : "unauthenticated user"}`,
      );
    }
  });
});
