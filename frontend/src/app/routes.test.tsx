import { render as rtlRender } from "@testing-library/react";
import { RouterProvider } from "react-router";
import { beforeEach, describe, expect, test, vi } from "vitest";

import {
  ElectionListRequestHandler,
  ElectionRequestHandler,
  ElectionStatusRequestHandler,
} from "@/testing/api-mocks/RequestHandlers";
import { overrideOnce, server } from "@/testing/server";
import { TestUserProvider } from "@/testing/TestUserProvider";
import { expectErrorPage, expectNotFound, setupTestRouter } from "@/testing/test-utils";
import type { DATA_ENTRY_CLAIM_REQUEST_PATH, ErrorResponse, Role } from "@/types/generated/openapi";
import { routes } from "./routes";

const renderWithRouter = (userRole: Role | null = null) => {
  const router = setupTestRouter(routes);
  rtlRender(
    <TestUserProvider userRole={userRole}>
      <RouterProvider router={router} />
    </TestUserProvider>,
  );
  return router;
};

describe("routes", () => {
  beforeEach(() => {
    server.use(ElectionListRequestHandler, ElectionRequestHandler, ElectionStatusRequestHandler);

    // error is expected
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  test("Non existing route results in not found page", async () => {
    // Router sanity checks
    const router = renderWithRouter();
    expect(router.state.location.pathname).toEqual("/dev");
    await router.navigate("/elections/1/data-entry");
    expect(router.state.location.pathname).toEqual("/elections/1/data-entry");

    // Navigate to a non existing route
    await router.navigate("/thisroutedoesnotexist");
    expect(router.state.location.pathname).toEqual("/thisroutedoesnotexist");
    await expectNotFound();
  });

  test("Malformed election ID should result in not found page", async () => {
    const router = renderWithRouter("typist_gsb");
    await router.navigate("/elections/1asd/data-entry/");
    await expectErrorPage();
  });

  test("Non existing election id results in not found page", async () => {
    // Navigate to a non-existing page
    const router = renderWithRouter("typist_gsb");
    overrideOnce("get", "/api/elections/9876", 404, null);
    await router.navigate("/elections/9876/data-entry");
    expect(router.state.location.pathname).toEqual("/elections/9876/data-entry");
    await expectNotFound("Verkiezing niet gevonden");
  });

  test("EntryNotFound API response results in not found page", async () => {
    overrideOnce("post", "/api/data_entries/9876/1/claim" satisfies DATA_ENTRY_CLAIM_REQUEST_PATH, 404, {
      error: "Item not found",
      fatal: true,
      reference: "EntryNotFound",
    } satisfies ErrorResponse);
    // Navigate to a non-existing page
    const router = renderWithRouter("typist_gsb");
    await router.navigate("/elections/1/data-entry/9876/1");
    expect(router.state.location.pathname).toEqual("/elections/1/data-entry/9876/1");
    await expectNotFound("Niet gevonden");
  });

  test("Non existing entry number results in not found page", async () => {
    // Navigate to a non-existing page
    const router = renderWithRouter("typist_gsb");
    await router.navigate("/elections/1/data-entry/1/3");
    expect(router.state.location.pathname).toEqual("/elections/1/data-entry/1/3");
    await expectNotFound("Het invoer nummer is ongeldig");
  });
});
