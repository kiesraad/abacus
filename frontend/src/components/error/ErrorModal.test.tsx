import { describe, expect, test } from "vitest";

import { render } from "@kiesraad/test";

import { ServerErrorModal } from "./ErrorModal.stories";

describe("Component: ErrorModal", () => {
  test("Server error has expected children", () => {
    const { getByText } = render(<ServerErrorModal />);

    expect(getByText("Sorry, er ging iets mis")).toBeInTheDocument();
    expect(getByText("Er is een interne fout opgetreden")).toBeInTheDocument();
  });
});
