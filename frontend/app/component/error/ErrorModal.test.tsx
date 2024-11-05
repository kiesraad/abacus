import { describe, expect, test } from "vitest";

import { render } from "app/test/unit";

import { ServerErrorModal } from "./ErrorModal.stories";

describe("Component: ErrorModal", () => {
  test("Server error has expected children", () => {
    const { getByText } = render(<ServerErrorModal />);

    expect(getByText("Er is iets misgegaan")).toBeInTheDocument();
    expect(getByText("500")).toBeInTheDocument();
  });
});
