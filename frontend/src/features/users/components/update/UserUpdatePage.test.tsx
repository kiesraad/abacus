import { screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { render, server } from "@/testing";
import { UserDeleteRequestHandler, UserGetRequestHandler, UserUpdateRequestHandler } from "@/testing/api-mocks";

import { UserUpdatePage } from "./UserUpdatePage";

const navigate = vi.fn();

vi.mock("@/hooks/useNumericParam", () => ({
  useNumericParam: () => 1,
}));

vi.mock(import("react-router"), async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => navigate,
}));

describe("UserUpdatePage", () => {
  beforeEach(() => {
    server.use(UserGetRequestHandler, UserUpdateRequestHandler, UserDeleteRequestHandler);
  });

  test("update user", async () => {
    render(<UserUpdatePage></UserUpdatePage>);
    expect(await screen.findByRole("heading", { name: "Details van het account" })).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Wijzigingen opslaan" }));

    const expectedMessage = "De wijzigingen in het account van Sanne Molenaar zijn opgeslagen";
    expect(navigate).toHaveBeenCalledExactlyOnceWith(`/users?updated=${encodeURIComponent(expectedMessage)}`);
  });

  test("delete user", async () => {
    render(<UserUpdatePage></UserUpdatePage>);
    expect(await screen.findByRole("heading", { name: "Details van het account" })).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Gebruiker verwijderen" }));
    expect(await screen.findByRole("dialog")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Verwijderen" }));

    const expectedMessage = "Het account van Sanne Molenaar is verwijderd";
    expect(navigate).toHaveBeenCalledExactlyOnceWith(`/users?deleted=${encodeURIComponent(expectedMessage)}`);
  });
});
