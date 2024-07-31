import { createMemoryRouter, RouterProvider } from "react-router-dom";

import { render as rtlRender } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import { screen } from "app/test/unit";

import { ApiProvider } from "@kiesraad/api";

import { routes } from "./routes";

const setupTestRouter = () => {
  return createMemoryRouter(routes);
};

describe("routes", () => {
  test("Non existing election id results in not found page", async () => {
    // Since we test what happens after an error, we want vitest to ignore them
    vi.spyOn(console, "error").mockImplementation(() => {
      /* do nothing */
    });

    const router = setupTestRouter();

    // Router sanity checks
    expect(router.state.location.pathname).toEqual("/");
    await router.navigate("/1/input");
    expect(router.state.location.pathname).toEqual("/1/input");

    // Navigate to a non-existing page
    await router.navigate("/-1/input");

    // NOTE: We're not using the wrapped render function here,
    // since we want control over our own memory router.
    rtlRender(
      <ApiProvider host="http://testhost">
        <RouterProvider router={router} />
      </ApiProvider>,
    );

    // Test that we get the Not Found page
    expect(await screen.findByText(/Er ging iet mis./)).toBeVisible();
  });
});
