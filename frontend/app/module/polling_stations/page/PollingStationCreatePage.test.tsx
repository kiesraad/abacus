import * as Router from "react-router";

import { screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import { render } from "app/test/unit";

import { PollingStationCreatePage } from "./PollingStationCreatePage";

describe("PollingStationCreatePage", () => {
  test("Shows form", () => {
    vi.spyOn(Router, "useParams").mockReturnValue({ electionId: "1" });

    render(<PollingStationCreatePage />);

    expect(screen.getByTestId("polling-station-form")).toBeVisible();
  });
});
