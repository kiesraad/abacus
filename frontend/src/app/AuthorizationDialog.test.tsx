import { RouterProvider } from "react-router";

import { render as rtlRender, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test } from "vitest";

import { InitialisedHandler } from "@/testing/api-mocks/RequestHandlers";
import { overrideOnce, server } from "@/testing/server";
import { render, screen, setupTestRouter, waitFor } from "@/testing/test-utils";
import { TestUserProvider } from "@/testing/TestUserProvider";

import { EXPIRATION_DIALOG_SECONDS } from "./authorizationConstants";
import { AuthorizationDialog } from "./AuthorizationDialog";
import { routes } from "./routes";

describe("AuthorizationDialog", () => {
  test("Does not show dialog when session is still valid", () => {
    const togo = 1000 * 60 * EXPIRATION_DIALOG_SECONDS;
    render(
      <TestUserProvider userRole="typist" overrideExpiration={new Date(Date.now() + togo + 1000)}>
        <AuthorizationDialog />
      </TestUserProvider>,
    );
    expect(screen.queryByTestId("modal-title")).toBeNull();
  });

  test("Show dialog on short session lifetime", () => {
    render(
      <TestUserProvider userRole="typist" overrideExpiration={new Date(Date.now() + 1000)}>
        <AuthorizationDialog />
      </TestUserProvider>,
    );

    expect(screen.queryByTestId("modal-title")).toHaveTextContent("Je wordt bijna uitgelogd");
  });

  test("Dialog can be closed", async () => {
    render(
      <TestUserProvider userRole="typist" overrideExpiration={new Date(Date.now() + 1000)}>
        <AuthorizationDialog />
      </TestUserProvider>,
    );

    await userEvent.click(await screen.findByRole("button", { name: "Annuleren" }));

    await waitFor(() => {
      expect(screen.queryByTestId("modal-title")).toBeNull();
    });
  });

  test("Dialog can be dismissed", async () => {
    render(
      <TestUserProvider userRole="typist" overrideExpiration={new Date(Date.now() + 1000)}>
        <AuthorizationDialog />
      </TestUserProvider>,
    );

    await userEvent.click(await screen.findByRole("button", { name: "Blijf ingelogd" }));

    await waitFor(() => {
      expect(screen.queryByTestId("modal-title")).toBeNull();
    });
  });

  test("Redirect should happen after expiration", async () => {
    server.use(InitialisedHandler);

    const router = setupTestRouter(routes);
    await router.navigate("/account");

    rtlRender(
      <TestUserProvider userRole="administrator" overrideExpiration={new Date(Date.now() - 1000)}>
        <RouterProvider router={router} />
      </TestUserProvider>,
    );

    const logoutAlert = await screen.findByRole("alert");
    expect(within(logoutAlert).getByRole("strong")).toHaveTextContent("Je bent automatisch uitgelogd");
  });

  test("Redirect should happen when not authorized", async () => {
    server.use(InitialisedHandler);

    overrideOnce("get", "/api/log", 200, {
      events: [],
      page: 1,
      pages: 1,
      perPage: 200,
    });

    const router = setupTestRouter(routes);
    await router.navigate("/logs");

    rtlRender(
      <TestUserProvider userRole={null} overrideExpiration={new Date(Date.now() + 1000 * 60)}>
        <RouterProvider router={router} />
      </TestUserProvider>,
    );

    const noAccessAlert = await screen.findByRole("alert");
    expect(within(noAccessAlert).getByRole("strong")).toHaveTextContent("Je hebt geen toegang tot deze pagina");
  });
});
