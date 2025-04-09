import { describe, expect, test } from "vitest";

import { render, screen, within } from "@/testing";

import { NetworkErrorModal, ServerErrorModal, UnknownServerErrorModal } from "./ErrorModal.stories";

describe("Component: ErrorModal", () => {
  test("Server error has expected children", () => {
    render(<ServerErrorModal />);

    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Sorry, er ging iets mis");

    const modalBody = screen.getByTestId("error-modal");
    expect(modalBody).toHaveTextContent("Er is een interne fout opgetreden");
    expect(modalBody).not.toHaveTextContent("Foutcode: 500");
    expect(within(modalBody).getByRole("button")).toHaveTextContent("Melding sluiten");
  });

  test("Unknown server error has expected children", () => {
    render(<UnknownServerErrorModal />);

    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Sorry, er ging iets mis");

    const modalBody = screen.getByTestId("error-modal");
    expect(modalBody).toHaveTextContent("Foutcode: 543");
    expect(modalBody).toHaveTextContent("Unknown Server Error");
    expect(within(modalBody).getByRole("button")).toHaveTextContent("Melding sluiten");
  });

  test("Network error has expected children", () => {
    render(<NetworkErrorModal />);

    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Sorry, er ging iets mis");

    const modalBody = screen.getByTestId("error-modal");
    expect(modalBody).toHaveTextContent("Network errors are the worst");
    expect(within(modalBody).getByRole("button")).toHaveTextContent("Melding sluiten");
  });
});
