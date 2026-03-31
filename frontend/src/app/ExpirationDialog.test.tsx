import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@/testing/test-utils";
import { ExpirationDialog } from "./ExpirationDialog";

describe("ExpirationDialog", () => {
  test("renders the expiration warning", () => {
    render(<ExpirationDialog sessionValidFor={60} onClose={vi.fn()} onStayLoggedIn={vi.fn()} />);

    expect(screen.queryByTestId("modal-title")).toHaveTextContent("Je wordt bijna uitgelogd");
    expect(screen.getByRole("button", { name: "Blijf ingelogd" })).toBeVisible();
  });

  test("calls onClose when the dialog is closed", async () => {
    const onClose = vi.fn();

    render(<ExpirationDialog sessionValidFor={60} onClose={onClose} onStayLoggedIn={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: "Venster sluiten" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test("calls onStayLoggedIn when the user extends the session", async () => {
    const onStayLoggedIn = vi.fn();

    render(<ExpirationDialog sessionValidFor={60} onClose={vi.fn()} onStayLoggedIn={onStayLoggedIn} />);

    await userEvent.click(screen.getByRole("button", { name: "Blijf ingelogd" }));

    expect(onStayLoggedIn).toHaveBeenCalledTimes(1);
  });
});
