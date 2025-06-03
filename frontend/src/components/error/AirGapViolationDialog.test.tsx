import { render as rtlRender, waitFor } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import { Providers } from "@/testing/Providers";
import { overrideOnce } from "@/testing/server";
import { screen, setupTestRouter } from "@/testing/test-utils";
import { routes } from "@/app/routes";

describe("AirGapViolationDialog", () => {
  test("Error dialog when air-gap violation is detected", async () => {

    // Since we test what happens after an error, we want vitest to ignore them
    vi.spyOn(console, "warn").mockImplementation(() => {
      /* do nothing */
    });
    vi.spyOn(console, "error").mockImplementation(() => {
      /* do nothing */
    });

    overrideOnce("get", "/api/whoami", 503, {
        error: "Blocking request due to airgap violation",
        fatal: true,
        reference: "AirgapViolation"
    });

    const router = setupTestRouter(routes);
    rtlRender(<Providers router={router} fetchInitialUser={true} />);

    // Wait for the modal to be loaded
    await waitFor(() => {
        expect(screen.queryByTestId("modal-title")).toBeVisible();
    });

    expect(screen.queryByTestId("modal-title")).toHaveTextContent("Abacus is niet beschikbaar");
  });
});
