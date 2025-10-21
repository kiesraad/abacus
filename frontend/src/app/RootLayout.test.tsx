import { RouteObject } from "react-router";

import { render as rtlRender, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import * as useUser from "@/hooks/user/useUser";
import * as userMockData from "@/testing/user-mock-data";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import { Providers } from "@/testing/Providers";
import { setupTestRouter } from "@/testing/test-utils";
import { Role } from "@/types/generated/openapi";

import { RootLayout } from "./RootLayout";

const render = (routes: RouteObject[]) => {
  const router = setupTestRouter(routes);
  rtlRender(<Providers router={router} />);

  return router;
};

describe("Route authorisation is handled", () => {
  test.each([
    { handle: { public: true }, ownRole: null, allowed: true },
    { handle: { public: true }, ownRole: "typist", allowed: true },
    { handle: { roles: [] }, ownRole: null, allowed: false },
    { handle: { roles: [] }, ownRole: "typist", allowed: false },
    { handle: { roles: ["typist"] }, ownRole: "typist", allowed: true },
    { handle: { roles: ["typist"] }, ownRole: "coordinator", allowed: false },
    { handle: { roles: ["coordinator", "typist"] }, ownRole: "coordinator", allowed: true },
    { handle: { roles: ["administrator", "coordinator", "typist"] }, ownRole: "administrator", allowed: true },
  ] satisfies Array<{
    handle: RouteObject["handle"];
    ownRole: Role | null;
    allowed: boolean;
  }>)("$handle, ownRole=$ownRole, allowed=$allowed", async ({ handle, ownRole, allowed }) => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    if (ownRole) {
      let user;
      switch (ownRole) {
        case "administrator":
          user = userMockData.getAdminUser();
          break;
        case "coordinator":
          user = userMockData.getCoordinatorUser();
          break;
        case "typist":
          user = userMockData.getTypistUser();
          break;
      }

      vi.spyOn(useUser, "useUser").mockReturnValue(user);
    }

    render([{ path: "/", Component: RootLayout, errorElement: <ErrorBoundary />, handle }]);

    if (allowed) {
      expect(await screen.findByTestId("app-frame")).toBeInTheDocument();
      expect(screen.queryByText(/Je hebt niet de juiste rechten/)).not.toBeInTheDocument();
    } else {
      expect(await screen.findByText(/Je hebt niet de juiste rechten/)).toBeVisible();
    }
  });
});
