import { render as rtlRender } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import {
  ElectionListRequestHandler,
  ElectionRequestHandler,
  ElectionStatusRequestHandler,
} from "@/testing/api-mocks/RequestHandlers";
import { Providers } from "@/testing/Providers";
import { overrideOnce, server } from "@/testing/server";
import { expectErrorPage, expectNotFound, setupTestRouter } from "@/testing/test-utils";

import { routes } from "./routes";

const renderWithRouter = () => {
  const router = setupTestRouter(routes);
  rtlRender(<Providers router={router} />);
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
    const router = renderWithRouter();
    await router.navigate("/elections/1asd/data-entry/");
    await expectErrorPage();
  });

  test("Non existing election id results in not found page", async () => {
    // Navigate to a non-existing page
    const router = renderWithRouter();
    overrideOnce("get", "/api/elections/9876", 404, null);
    await router.navigate("/elections/9876/data-entry");
    expect(router.state.location.pathname).toEqual("/elections/9876/data-entry");
    await expectNotFound("Verkiezing niet gevonden");
  });

  test("Non existing polling station id results in not found page", async () => {
    // Navigate to a non-existing page
    const router = renderWithRouter();
    await router.navigate("/elections/1/data-entry/9876/1");
    expect(router.state.location.pathname).toEqual("/elections/1/data-entry/9876/1");
    await expectNotFound("Stembureau niet gevonden");
  });

  test("Non existing entry number results in not found page", async () => {
    // Navigate to a non-existing page
    const router = renderWithRouter();
    await router.navigate("/elections/1/data-entry/1/3");
    expect(router.state.location.pathname).toEqual("/elections/1/data-entry/1/3");
    await expectNotFound("Het invoer nummer is ongeldig");
  });
});
