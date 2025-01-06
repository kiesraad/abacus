import { render as rtlRender } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { routes } from "app/routes";

import { electionStatusMockResponse } from "@kiesraad/api-mocks";
import { expectErrorPage, expectNotFound, overrideOnce, Providers, setupTestRouter } from "@kiesraad/test";

// NOTE: We're not using the wrapped render function here,
// since we want control over our own memory router.
const router = setupTestRouter(routes);
const render = () => rtlRender(<Providers router={router} />);

describe("routes", () => {
  beforeEach(() => {
    // Since we test what happens after an error, we want vitest to ignore them
    vi.spyOn(console, "error").mockImplementation(() => {
      /* do nothing */
    });
  });

  test("Non existing route results in not found page", async () => {
    // Router sanity checks
    expect(router.state.location.pathname).toEqual("/");
    await router.navigate("/elections/1/data-entry");
    expect(router.state.location.pathname).toEqual("/elections/1/data-entry");

    // Navigate to a non existing route
    await router.navigate("/thisroutedoesnotexist");
    expect(router.state.location.pathname).toEqual("/thisroutedoesnotexist");
    render();
    await expectNotFound();
  });

  test("Malformed election ID should result in not found page", async () => {
    await router.navigate("/elections/1asd/data-entry/");
    render();
    await expectErrorPage();
  });

  test("Non existing election id results in not found page", async () => {
    // Navigate to a non-existing page
    await router.navigate("/elections/9876/data-entry");
    expect(router.state.location.pathname).toEqual("/elections/9876/data-entry");
    render();
    await expectNotFound("Verkiezing niet gevonden");
  });

  test("Non existing polling station id results in not found page", async () => {
    render();
    // Navigate to a non-existing page
    await router.navigate("/elections/1/data-entry/9876/1");
    expect(router.state.location.pathname).toEqual("/elections/1/data-entry/9876/1");
    await expectNotFound("Stembureau niet gevonden");
  });

  test("Error page when polling station is finalised", async () => {
    overrideOnce("get", "/api/elections/1/status", 200, electionStatusMockResponse);
    await router.navigate("/elections/1/data-entry/2/1");
    expect(router.state.location.pathname).toEqual("/elections/1/data-entry/2/1");
    render();
    await expectErrorPage();
  });
});
