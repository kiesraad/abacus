import userEvent from "@testing-library/user-event";
import { describe, expect, test } from "vitest";

import { render, screen, within } from "@/testing";

import { NetworkErrorModal, ServerErrorModal, UnknownServerErrorModal } from "./ErrorModal.stories";

describe("Component: ErrorModal", () => {
  test("Server error modal is shown and can be closed", async () => {
    render(<ServerErrorModal />);

    expect(screen.getByRole("heading", { level: 2, name: "Sorry, er ging iets mis" })).toBeVisible();

    const modalBody = screen.getByTestId("error-modal");
    expect(modalBody).toHaveTextContent("Er is een interne fout opgetreden");
    expect(modalBody).not.toHaveTextContent("Foutcode: 500");
    expect(within(modalBody).getByRole("button")).toHaveTextContent("Melding sluiten");

    const user = userEvent.setup();
    await user.click(within(modalBody).getByRole("button", { name: "Melding sluiten" }));
    expect(screen.queryByRole("heading", { level: 2, name: "Sorry, er ging iets mis" })).not.toBeInTheDocument();
  });

  test("Unknown server error modal is shown and can be closed", async () => {
    render(<UnknownServerErrorModal />);

    expect(screen.getByRole("heading", { level: 2, name: "Sorry, er ging iets mis" })).toBeVisible();

    const modalBody = screen.getByTestId("error-modal");
    expect(modalBody).toHaveTextContent("Foutcode: 543");
    expect(modalBody).toHaveTextContent("Unknown Server Error");
    expect(within(modalBody).getByRole("button")).toHaveTextContent("Melding sluiten");

    const user = userEvent.setup();
    await user.click(within(modalBody).getByRole("button", { name: "Melding sluiten" }));
    expect(screen.queryByRole("heading", { level: 2, name: "Sorry, er ging iets mis" })).not.toBeInTheDocument();
  });

  test("Network error modal is shown and can be closed", async () => {
    render(<NetworkErrorModal />);

    expect(screen.getByRole("heading", { level: 2, name: "Sorry, er ging iets mis" })).toBeVisible();

    const modalBody = screen.getByTestId("error-modal");
    expect(modalBody).toHaveTextContent("Network errors are the worst");
    expect(within(modalBody).getByRole("button")).toHaveTextContent("Melding sluiten");

    const user = userEvent.setup();
    await user.click(within(modalBody).getByRole("button", { name: "Melding sluiten" }));
    expect(screen.queryByRole("heading", { level: 2, name: "Sorry, er ging iets mis" })).not.toBeInTheDocument();
  });
});
