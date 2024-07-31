import { createMemoryRouter, Router, RouterProvider } from "react-router-dom";

import { render as rtlRender } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { overrideOnce, screen } from "app/test/unit";

import { ApiProvider } from "@kiesraad/api";

import { routes } from "./routes";

const setupTestRouter = () => {
  return createMemoryRouter(routes);
};

const expectNotFound = async (router: any) => {
  
    // NOTE: We're not using the wrapped render function here,
    // since we want control over our own memory router.
    rtlRender(
      <ApiProvider host="http://testhost">
        <RouterProvider router={router} />
      </ApiProvider>,
    );

  expect(await screen.findByText(/Er ging iet mis./)).toBeVisible();
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

    await expectNotFound(router);
  });

  test("Malformed election ID should result in not found page", async () => {
    const router = setupTestRouter();
    await router.navigate("/1asd/input/");
    await expectNotFound(router);
  });

  test("Non existing election id results in not found page", async () => {
    const router = setupTestRouter();
    expect(router.state.location.pathname).toEqual("/");
    await router.navigate("/1/input");
    expect(router.state.location.pathname).toEqual("/1/input");

    // Navigate to a non-existing page
    await router.navigate("/-1/input");
    expect(router.state.location.pathname).toEqual("/-1/input");
    
    // Test that we get the Not Found page
    await expectNotFound(router);
  });
});
