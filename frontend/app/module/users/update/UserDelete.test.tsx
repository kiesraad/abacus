import { screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";

import { render } from "@kiesraad/test";

import { UserDelete } from "./UserDelete";

function renderComponent(saving = false) {
  const onDelete = vi.fn();
  render(<UserDelete onDelete={onDelete} saving={saving}></UserDelete>);
  return { onDelete };
}

describe("UserDelete", () => {
  test("delete after confirm", async () => {
    const { onDelete } = renderComponent();

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Gebruiker verwijderen" }));

    expect(await screen.findByRole("dialog")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Verwijderen" }));
    expect(onDelete).toHaveBeenCalledOnce();
  });

  test("cancel delete", async () => {
    const { onDelete } = renderComponent();

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Gebruiker verwijderen" }));

    expect(await screen.findByRole("dialog")).toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: "Annuleren" })[0]!);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(onDelete).not.toHaveBeenCalledOnce();
  });
});
