import { render } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { ElectionStatusWithIcon } from "./ElectionStatusWithIcon";

describe("ElectionStatusWithIcon", () => {
  test("renders the correct header coordinator status for DataEntryInProgress", () => {
    const { getByText, getByRole } = render(ElectionStatusWithIcon("DataEntryInProgress", true, true));

    expect(getByText("Steminvoer bezig")).toBeVisible();
    expect(getByText("(eerste zitting)")).toBeVisible();
    expect(getByRole("img")).toBeVisible();
  });

  test("renders the correct header coordinator status for FinishDataEntry", () => {
    const { getByText, getByRole } = render(ElectionStatusWithIcon("FinishDataEntry", true, true));

    expect(getByText("Steminvoer afronden")).toBeVisible();
    expect(getByText("(eerste zitting)")).toBeVisible();
    expect(getByRole("img")).toBeVisible();
  });

  test("renders the correct header coordinator status for DataEntryFinished", () => {
    const { getByText, getByRole } = render(ElectionStatusWithIcon("DataEntryFinished", true, true));

    expect(getByText("Steminvoer afgerond")).toBeVisible();
    expect(getByText("(eerste zitting)")).toBeVisible();
    expect(getByRole("img")).toBeVisible();
  });

  test("renders the correct header typist status for DataEntryInProgress", () => {
    const { getByText, getByRole } = render(ElectionStatusWithIcon("DataEntryInProgress", true, false));

    expect(getByText("Invoer gestart")).toBeVisible();
    expect(getByText("(eerste zitting)")).toBeVisible();
    expect(getByRole("img")).toBeVisible();
  });

  test("renders the correct header typist status for FinishDataEntry", () => {
    const { getByText, getByRole } = render(ElectionStatusWithIcon("FinishDataEntry", true, false));

    expect(getByText("Steminvoer afronden")).toBeVisible();
    expect(getByText("(eerste zitting)")).toBeVisible();
    expect(getByRole("img")).toBeVisible();
  });

  test("renders the correct header typist status for DataEntryFinished", () => {
    const { getByText, getByRole } = render(ElectionStatusWithIcon("DataEntryFinished", true, false));

    expect(getByText("Steminvoer voltooid")).toBeVisible();
    expect(getByText("(eerste zitting)")).toBeVisible();
    expect(getByRole("img")).toBeVisible();
  });

  test("renders the correct table coordinator status for DataEntryInProgress", () => {
    const { getByText, queryByText, getByRole } = render(ElectionStatusWithIcon("DataEntryInProgress", false, true));

    expect(getByText("Steminvoer bezig")).toBeVisible();
    expect(queryByText("(eerste zitting)")).not.toBeInTheDocument();
    expect(getByRole("img")).toBeVisible();
  });

  test("renders the correct table coordinator status for FinishDataEntry", () => {
    const { getByText, queryByText, getByRole } = render(ElectionStatusWithIcon("FinishDataEntry", false, true));

    expect(getByText("Steminvoer afronden")).toBeVisible();
    expect(queryByText("(eerste zitting)")).not.toBeInTheDocument();
    expect(getByRole("img")).toBeVisible();
  });

  test("renders the correct table coordinator status for DataEntryFinished", () => {
    const { getByText, queryByText, getByRole } = render(ElectionStatusWithIcon("DataEntryFinished", false, true));

    expect(getByText("Steminvoer afgerond")).toBeVisible();
    expect(queryByText("(eerste zitting)")).not.toBeInTheDocument();
    expect(getByRole("img")).toBeVisible();
  });

  test("renders the correct table typist status for DataEntryInProgress", () => {
    const { getByText, queryByText, getByRole } = render(ElectionStatusWithIcon("DataEntryInProgress", false, false));

    expect(getByText("Invoer gestart")).toBeVisible();
    expect(queryByText("(eerste zitting)")).not.toBeInTheDocument();
    expect(getByRole("img")).toBeVisible();
  });

  test("renders the correct table typist status for FinishDataEntry", () => {
    const { getByText, queryByText, getByRole } = render(ElectionStatusWithIcon("FinishDataEntry", false, false));

    expect(getByText("Steminvoer afronden")).toBeVisible();
    expect(queryByText("(eerste zitting)")).not.toBeInTheDocument();
    expect(getByRole("img")).toBeVisible();
  });

  test("renders the correct table typist status for DataEntryFinished", () => {
    const { getByText, queryByText, getByRole } = render(ElectionStatusWithIcon("DataEntryFinished", false, false));

    expect(getByText("Steminvoer voltooid")).toBeVisible();
    expect(queryByText("(eerste zitting)")).not.toBeInTheDocument();
    expect(getByRole("img")).toBeVisible();
  });
});
