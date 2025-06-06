import { render as rtlRender, waitFor } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { ApiProvider } from "@/api/ApiProvider";
import { overrideOnce } from "@/testing/server";
import { screen } from "@/testing/test-utils";

import { AirGapViolationDialog } from "./AirGapviolationDialog";

describe("AirGapViolationDialog", () => {
  test("Error dialog when air-gap violation is detected", async () => {
    overrideOnce("get", "/api/user/whoami", 503, {
      error: "Blocking request due to airgap violation",
      fatal: true,
      reference: "AirgapViolation",
    });

    rtlRender(
      <ApiProvider fetchInitialUser={true}>
        <AirGapViolationDialog />
      </ApiProvider>,
    );

    // Wait for the modal to be loaded
    await waitFor(() => {
      expect(screen.queryByTestId("modal-title")).toHaveTextContent("Abacus is niet beschikbaar");
    });
  });
});
