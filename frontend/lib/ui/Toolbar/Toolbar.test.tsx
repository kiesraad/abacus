import { within } from "@testing-library/dom";
import { describe, expect, test } from "vitest";

import { render, screen } from "@kiesraad/test";

import { BasicToolbar } from "./Toolbar.stories";

describe("Toolbar", () => {
  test("BasicToolbar renders", async () => {
    render(<BasicToolbar pos="end" />);

    const toolbar = await screen.findByTestId("basic-toolbar");

    expect(toolbar).toBeInTheDocument();

    const button1 = within(toolbar).getByTestId("button1");
    const button2 = within(toolbar).getByTestId("button2");

    expect(button1).toBeInTheDocument();
    expect(button2).toBeInTheDocument();
  });
});
