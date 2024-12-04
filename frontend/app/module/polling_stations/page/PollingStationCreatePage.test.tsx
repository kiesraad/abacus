import * as Router from "react-router";

import { screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import { render } from "app/test/unit";

import { PollingStationCreatePage } from "./PollingStationCreatePage";

describe("PollingStationCreatePage", () => {
  test("Shows form", async () => {
    vi.spyOn(Router, "useParams").mockReturnValue({ electionId: "1" });

    render(<PollingStationCreatePage />);

    const form = await screen.findByTestId("polling-station-form");
    expect(form).toBeVisible();
  });
});
