import { createMemoryRouter, RouterProvider } from "react-router-dom";

import { render as rtlRender } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { screen } from "app/test/unit";

import { ApiProvider } from "@kiesraad/api";

import { routes } from "./routes";

const setupTestRouter = () => {
  return createMemoryRouter(routes);
};

const expectNotFound = async () => {
  expect(await screen.findByText(/Er ging iets mis./)).toBeVisible();
};

describe("routes", () => {
  beforeEach(() => {
    // Since we test what happens after an error, we want vitest to ignore them
    vi.spyOn(console, "error").mockImplementation(() => {
      /* do nothing */
    });
  });

  test("Non existing route results in not found page", async () => {
    const router = setupTestRouter();

    // Router sanity checks
    expect(router.state.location.pathname).toEqual("/");
    await router.navigate("/1/input");
    expect(router.state.location.pathname).toEqual("/1/input");

    // Navigate to a non existing route
    await router.navigate("/thisroutedoesnotexist");
    expect(router.state.location.pathname).toEqual("/thisroutedoesnotexist");

    // NOTE: We're not using the wrapped render function here,
    // since we want control over our own memory router.
    rtlRender(
      <ApiProvider host="http://testhost">
        <RouterProvider router={router} />
      </ApiProvider>,
    );

    await expectNotFound();
  });

  test("Malformed election ID should result in not found page", async () => {
    const router = setupTestRouter();
    await router.navigate("/1asd/input/");

    // NOTE: We're not using the wrapped render function here,
    // since we want control over our own memory router.
    rtlRender(
      <ApiProvider host="http://testhost">
        <RouterProvider router={router} />
      </ApiProvider>,
    );

    await expectNotFound();
  });

  test("Non existing election id results in not found page", async () => {
    const router = setupTestRouter();

    // Navigate to a non-existing page
    await router.navigate("/9876/input");
    expect(router.state.location.pathname).toEqual("/9876/input");

    // NOTE: We're not using the wrapped render function here,
    // since we want control over our own memory router.
    rtlRender(
      <ApiProvider host="http://testhost">
        <RouterProvider router={router} />
      </ApiProvider>,
    );

    // Test that we get the Not Found page
    await expectNotFound();
  });

  test("Non existing polling station id results in not found page", async () => {
    const router = setupTestRouter();

    // Navigate to a non-existing page
    await router.navigate("/1/input/9876");
    expect(router.state.location.pathname).toEqual("/1/input/9876");

    // NOTE: We're not using the wrapped render function here,
    // since we want control over our own memory router.
    rtlRender(
      <ApiProvider host="http://testhost">
        <RouterProvider router={router} />
      </ApiProvider>,
    );

    // Test that we get the Not Found page
    await expectNotFound();
  });
});
