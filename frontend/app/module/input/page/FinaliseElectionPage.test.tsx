import { RouterProvider } from "react-router-dom";

import { render as rtlRender, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import { expectNotFound, overrideOnce, render, setupTestRouter } from "app/test/unit";

import { ApiProvider, ElectionProvider, ElectionStatusProvider } from "@kiesraad/api";

import { FinaliseElectionPage } from "./FinaliseElectionPage";

describe("FinaliseElectionPage", () => {
  test("Error when election is not ready", async () => {
    // Since we test what happens after an error, we want vitest to ignore them
    vi.spyOn(console, "error").mockImplementation(() => {
      /* do nothing */
    });
    const router = setupTestRouter();

    overrideOnce("get", "/api/elections/1/status", 200, {
      statuses: [
        { id: 1, status: "Incomplete" },
        { id: 2, status: "Complete" },
      ],
    });

    await router.navigate("/1/input/finalise");

    // NOTE: We're not using the wrapped render function here,
    // since we want control over our own memory router.
    rtlRender(
      <ApiProvider host="http://testhost">
        <RouterProvider router={router} />
      </ApiProvider>,
    );

    await expectNotFound();
  });

  test("Shows button", async () => {
    overrideOnce("get", "/api/elections/1/status", 200, {
      statuses: [
        { id: 1, status: "Complete" },
        { id: 2, status: "Complete" },
      ],
    });

    render(
      <ElectionProvider electionId={1}>
        <ElectionStatusProvider electionId={1}>
          <FinaliseElectionPage />
        </ElectionStatusProvider>
      </ElectionProvider>,
    );

    expect(await screen.findByRole("button", { name: "Download proces-verbaal" })).toBeVisible();
  });
});
