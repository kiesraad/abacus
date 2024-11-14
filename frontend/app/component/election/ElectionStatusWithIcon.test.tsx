import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { ElectionStatusWithIcon } from "./ElectionStatusWithIcon";

describe("ElectionStatusWithIcon", () => {
  test("renders all election statuses correctly", () => {
    const { rerender } = render(ElectionStatusWithIcon("DataEntryInProgress", true, true));

    expect(screen.getByText("Steminvoer bezig")).toBeVisible();
    expect(screen.getByText("(eerste zitting)")).toBeVisible();
    expect(screen.getByRole("img")).toBeVisible();

    rerender(ElectionStatusWithIcon("FinishDataEntry", true, true));

    expect(screen.getByText("Steminvoer afronden")).toBeVisible();
    expect(screen.getByText("(eerste zitting)")).toBeVisible();
    expect(screen.getByRole("img")).toBeVisible();

    rerender(ElectionStatusWithIcon("DataEntryFinished", true, true));

    expect(screen.getByText("Steminvoer afgerond")).toBeVisible();
    expect(screen.getByText("(eerste zitting)")).toBeVisible();
    expect(screen.getByRole("img")).toBeVisible();

    rerender(ElectionStatusWithIcon("DataEntryInProgress", true, false));

    expect(screen.getByText("Invoer gestart")).toBeVisible();
    expect(screen.getByText("(eerste zitting)")).toBeVisible();
    expect(screen.getByRole("img")).toBeVisible();

    rerender(ElectionStatusWithIcon("FinishDataEntry", true, false));

    expect(screen.getByText("Steminvoer afronden")).toBeVisible();
    expect(screen.getByText("(eerste zitting)")).toBeVisible();
    expect(screen.getByRole("img")).toBeVisible();

    rerender(ElectionStatusWithIcon("DataEntryFinished", true, false));

    expect(screen.getByText("Steminvoer voltooid")).toBeVisible();
    expect(screen.getByText("(eerste zitting)")).toBeVisible();
    expect(screen.getByRole("img")).toBeVisible();

    rerender(ElectionStatusWithIcon("DataEntryInProgress", false, true));

    expect(screen.getByText("Steminvoer bezig")).toBeVisible();
    expect(screen.queryByText("(eerste zitting)")).not.toBeInTheDocument();
    expect(screen.getByRole("img")).toBeVisible();

    rerender(ElectionStatusWithIcon("FinishDataEntry", false, true));

    expect(screen.getByText("Steminvoer afronden")).toBeVisible();
    expect(screen.queryByText("(eerste zitting)")).not.toBeInTheDocument();
    expect(screen.getByRole("img")).toBeVisible();

    rerender(ElectionStatusWithIcon("DataEntryFinished", false, true));

    expect(screen.getByText("Steminvoer afgerond")).toBeVisible();
    expect(screen.queryByText("(eerste zitting)")).not.toBeInTheDocument();
    expect(screen.getByRole("img")).toBeVisible();

    rerender(ElectionStatusWithIcon("DataEntryInProgress", false, false));

    expect(screen.getByText("Invoer gestart")).toBeVisible();
    expect(screen.queryByText("(eerste zitting)")).not.toBeInTheDocument();
    expect(screen.getByRole("img")).toBeVisible();

    rerender(ElectionStatusWithIcon("FinishDataEntry", false, false));

    expect(screen.getByText("Steminvoer afronden")).toBeVisible();
    expect(screen.queryByText("(eerste zitting)")).not.toBeInTheDocument();
    expect(screen.getByRole("img")).toBeVisible();

    rerender(ElectionStatusWithIcon("DataEntryFinished", false, false));

    expect(screen.getByText("Steminvoer voltooid")).toBeVisible();
    expect(screen.queryByText("(eerste zitting)")).not.toBeInTheDocument();
    expect(screen.getByRole("img")).toBeVisible();
  });
});
