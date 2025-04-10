import { render as rtlRender } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { ElectionProvider, ElectionStatusProvider } from "@/api";
// eslint-disable-next-line import/no-restricted-paths -- #1283
import { routes } from "@/app/routes";
import { ElectionRequestHandler } from "@/testing/api-mocks/RequestHandlers";
import { Providers } from "@/testing/Providers";
import { overrideOnce, server } from "@/testing/server";
import { expectErrorPage, render, screen, setupTestRouter } from "@/testing/test-utils";

import { ElectionReportPage } from "./ElectionReportPage";

describe("ElectionReportPage", () => {
  beforeEach(() => {
    server.use(ElectionRequestHandler);
  });

  test("Error when election is not ready", async () => {
    // Since we test what happens after an error, we want vitest to ignore them
    vi.spyOn(console, "error").mockImplementation(() => {
      /* do nothing */
    });
    const router = setupTestRouter(routes);

    overrideOnce("get", "/api/elections/1/status", 200, {
      statuses: [
        { id: 1, status: "not_started" },
        { id: 2, status: "definitive" },
      ],
    });

    await router.navigate("/elections/1/report");

    rtlRender(<Providers router={router} />);

    await expectErrorPage();
  });

  test("Shows button", async () => {
    overrideOnce("get", "/api/elections/1/status", 200, {
      statuses: [
        { id: 1, status: "definitive" },
        { id: 2, status: "definitive" },
      ],
    });

    render(
      <ElectionProvider electionId={1}>
        <ElectionStatusProvider electionId={1}>
          <ElectionReportPage />
        </ElectionStatusProvider>
      </ElectionProvider>,
    );

    // Wait for the page to be loaded
    expect(await screen.findByRole("heading", { level: 1, name: "Steminvoer eerste zitting afronden" }));
    expect(await screen.findByRole("heading", { level: 2, name: "Invoerfase afronden?" }));
    expect(await screen.findByRole("button", { name: "Download los proces-verbaal" })).toBeVisible();
    expect(await screen.findByRole("button", { name: "Download proces-verbaal met telbestand" })).toBeVisible();
  });
});
