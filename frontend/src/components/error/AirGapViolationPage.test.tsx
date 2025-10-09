import { render as rtlRender, waitFor } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { ApiProvider } from "@/api/ApiProvider";
import { overrideOnce } from "@/testing/server";
import { screen } from "@/testing/test-utils";

import { AirGapViolationPage } from "./AirGapViolationPage";

describe("AirGapViolationPage", () => {
  test("Error dialog when air-gap violation is detected", async () => {
    overrideOnce("get", "/api/whoami", 503, {
      error: "Blocking request due to airgap violation",
      fatal: true,
      reference: "AirgapViolation",
    });

    rtlRender(
      <ApiProvider fetchInitialUser={true}>
        <AirGapViolationPage />
      </ApiProvider>,
    );

    // Wait for the modal to be loaded
    await waitFor(() => {
      expect(screen.queryByTestId("error-title")).toHaveTextContent("Abacus zit op slot");
    });
  });
});
