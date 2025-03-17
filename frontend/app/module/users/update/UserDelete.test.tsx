import { screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { beforeEach, describe, expect, Mock, test, vi } from "vitest";

import { User, USER_DELETE_REQUEST_PATH } from "@kiesraad/api";
import { UserDeleteRequestHandler } from "@kiesraad/api-mocks";
import { overrideOnce, render, server, spyOnHandler } from "@kiesraad/test";

import { UserDelete } from "./UserDelete";

function renderComponent() {
  const onDeleted = vi.fn();
  const onError = vi.fn();
  render(<UserDelete user={{ id: 1 } as User} onDeleted={onDeleted} onError={onError}></UserDelete>);
  return { onDeleted, onError };
}

describe("UserDelete", () => {
  let deleteUser: Mock;

  beforeEach(() => {
    server.use(UserDeleteRequestHandler);
    deleteUser = spyOnHandler(UserDeleteRequestHandler);
  });

  test("delete after confirm", async () => {
    const { onDeleted } = renderComponent();

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Gebruiker verwijderen" }));

    expect(await screen.findByRole("dialog")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Verwijderen" }));
    expect(deleteUser).toHaveBeenCalledOnce();
    expect(onDeleted).toHaveBeenCalledOnce();
  });

  test("cancel delete", async () => {
    const { onDeleted } = renderComponent();

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Gebruiker verwijderen" }));

    expect(await screen.findByRole("dialog")).toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: "Annuleren" })[0]!);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(deleteUser).not.toHaveBeenCalledOnce();
    expect(onDeleted).not.toHaveBeenCalledOnce();
  });

  test("on error", async () => {
    overrideOnce("delete", "/api/user/1" satisfies USER_DELETE_REQUEST_PATH, 401, {
      error: "Invalid session",
      fatal: false,
      reference: "InvalidSession",
    });

    const { onDeleted, onError } = renderComponent();

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Gebruiker verwijderen" }));

    expect(await screen.findByRole("dialog")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Verwijderen" }));

    expect(onError).toHaveBeenCalledOnce();
    expect(onDeleted).not.toHaveBeenCalledOnce();
  });
});
