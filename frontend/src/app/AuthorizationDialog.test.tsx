import { render as rtlRender, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { type RouteObject, RouterProvider } from "react-router";
import { describe, expect, test, vi } from "vitest";
import { LoginForm } from "@/features/account/components/LoginForm";
import { TestUserProvider } from "@/testing/TestUserProvider";
import { render, screen, setupTestRouter, waitFor } from "@/testing/test-utils";
import type { Role } from "@/types/generated/openapi";
import { AuthorizationDialog } from "./AuthorizationDialog";
import { AuthorizationGuard } from "./AuthorizationGuard";
import { EXPIRATION_DIALOG_SECONDS } from "./authorizationConstants";

function TestAuthorizationDialog({ sessionValidFor }: { sessionValidFor: number | null }) {
  const [hideDialog, setHideDialog] = useState(false);

  return (
    <AuthorizationDialog sessionValidFor={sessionValidFor} hideDialog={hideDialog} setHideDialog={setHideDialog} />
  );
}

async function renderAuthorizationRouter({
  initialPath,
  routes,
  userRole,
  expiration,
}: {
  initialPath: string;
  routes: RouteObject[];
  userRole: Role | null;
  expiration: Date;
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

describe("AuthorizationDialog", () => {
  test("Does not show dialog when session is still valid", () => {
    render(
      <TestUserProvider userRole="typist_gsb">
        <TestAuthorizationDialog sessionValidFor={EXPIRATION_DIALOG_SECONDS + 1} />
      </TestUserProvider>,
    );
    expect(screen.queryByTestId("modal-title")).toBeNull();
  });

  test("Show dialog on short session lifetime", () => {
    render(
      <TestUserProvider userRole="typist_gsb">
        <TestAuthorizationDialog sessionValidFor={60} />
      </TestUserProvider>,
    );

    expect(screen.queryByTestId("modal-title")).toHaveTextContent("Je wordt bijna uitgelogd");
  });

  test("Does not show dialog when the user is not logged in", () => {
    render(
      <TestUserProvider userRole={null}>
        <TestAuthorizationDialog sessionValidFor={60} />
      </TestUserProvider>,
    );

    expect(screen.queryByTestId("modal-title")).not.toBeInTheDocument();
  });

  test("Dialog can be closed", async () => {
    render(
      <TestUserProvider userRole="typist_gsb">
        <TestAuthorizationDialog sessionValidFor={60} />
      </TestUserProvider>,
    );

    await userEvent.click(await screen.findByRole("button", { name: "Venster sluiten" }));

    await waitFor(() => {
      expect(screen.queryByTestId("modal-title")).toBeNull();
    });
  });

  test("Dialog can be dismissed", async () => {
    render(
      <TestUserProvider userRole="typist_gsb">
        <TestAuthorizationDialog sessionValidFor={60} />
      </TestUserProvider>,
    );

    await userEvent.click(await screen.findByRole("button", { name: "Blijf ingelogd" }));

    await waitFor(() => {
      expect(screen.queryByTestId("modal-title")).toBeNull();
    });
  });

  test("Redirect should happen after expiration", async () => {
    const router = await renderAuthorizationRouter({
      initialPath: "/account",
      userRole: "administrator",
      expiration: new Date(Date.now() - 1000),
      routes: [
        {
          path: "/account",
          element: (
            <AuthorizationGuard>
              <div>Account page</div>
            </AuthorizationGuard>
          ),
          handle: { roles: ["administrator"] },
        },
        {
          path: "/account/login",
          element: <LoginForm />,
          handle: { public: true },
        },
      ],
    });

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/account/login");
    });

    const logoutText = within(await screen.findByRole("alert")).getByRole("strong");
    expect(logoutText).toHaveTextContent("Je bent automatisch uitgelogd");
    expect(logoutText).toBeVisible();
  });

  test("Redirect should happen when not authenticated", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    const router = await renderAuthorizationRouter({
      initialPath: "/logs",
      userRole: null,
      expiration: new Date(Date.now() + 1000 * 60),
      routes: [
        {
          path: "/logs",
          element: (
            <AuthorizationGuard>
              <div>Logs page</div>
            </AuthorizationGuard>
          ),
          handle: { roles: ["administrator"] },
        },
        {
          path: "/account/login",
          element: <LoginForm />,
          handle: { public: true },
        },
      ],
    });

    expect(router.state.location.pathname).toBe("/account/login");
    expect(router.state.location.state).toEqual({ unauthorized: true });
  });
});
