import { describe, expect, test } from "vitest";

import { render } from "@/testing";

import { ServerErrorModal } from "./ErrorModal.stories";

describe("Component: ErrorModal", () => {
  test("Server error has expected children", () => {
    const { getByText } = render(<ServerErrorModal />);

    expect(getByText("Sorry, er ging iets mis")).toBeInTheDocument();
  });
});
