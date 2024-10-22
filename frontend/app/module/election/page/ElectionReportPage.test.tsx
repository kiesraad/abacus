import { render as rtlRender, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import { ElectionReportPage } from "app/module/election";
import { expectErrorPage, overrideOnce, Providers, render, setupTestRouter } from "app/test/unit";

import { ElectionProvider, ElectionStatusProvider } from "@kiesraad/api";

describe("ElectionReportPage", () => {
  test("Error when election is not ready", async () => {
    // Since we test what happens after an error, we want vitest to ignore them
    vi.spyOn(console, "error").mockImplementation(() => {
      /* do nothing */
    });
    const router = setupTestRouter();

    overrideOnce("get", "/api/elections/1/status", 200, {
      statuses: [
        { id: 1, status: "first_entry" },
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

    expect(await screen.findByRole("button", { name: "Download proces-verbaal" })).toBeVisible();
  });
});
