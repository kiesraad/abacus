import { describe, expect, test } from "vitest";

import { render, screen, within } from "@/testing";

import { ServerErrorModal } from "./ErrorModal.stories";

describe("Component: ErrorModal", () => {
  test("Server error has expected children", () => {
    render(<ServerErrorModal />);

    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Sorry, er ging iets mis");

    const modalBody = screen.getByTestId("error-modal");
    expect(modalBody).toHaveTextContent("Er is een interne fout opgetreden");
    expect(modalBody).not.toHaveTextContent("Foutcode: 500");
    expect(within(modalBody).getByRole("button")).toHaveTextContent("Melding sluiten");
  });
});
