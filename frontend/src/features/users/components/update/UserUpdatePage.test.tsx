import { userEvent } from "@testing-library/user-event";
import * as ReactRouter from "react-router";
import { beforeEach, describe, expect, test, vi } from "vitest";

import * as useUser from "@/hooks/user/useUser";
import {
  UserDeleteRequestHandler,
  UserGetRequestHandler,
  UserUpdateRequestHandler,
} from "@/testing/api-mocks/RequestHandlers";
import { overrideOnce, server } from "@/testing/server";
import { render, screen, waitFor } from "@/testing/test-utils";
import { getAdminUser } from "@/testing/user-mock-data";

import { UserUpdatePage } from "./UserUpdatePage";

const navigate = vi.fn();

describe("UserUpdatePage", () => {
  beforeEach(() => {
    server.use(UserGetRequestHandler, UserUpdateRequestHandler, UserDeleteRequestHandler);
    vi.spyOn(ReactRouter, "useNavigate").mockImplementation(() => navigate);
    vi.spyOn(ReactRouter, "useParams").mockReturnValue({ userId: "1" });
  });

  test("update user", async () => {
    render(<UserUpdatePage></UserUpdatePage>);
    expect(await screen.findByRole("heading", { level: 2, name: "Details van het account" })).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Wijzigingen opslaan" }));

    const expectedMessage = "De wijzigingen in het account van Sanne Molenaar zijn opgeslagen";
    expect(navigate).toHaveBeenCalledExactlyOnceWith(`/users?updated=${encodeURIComponent(expectedMessage)}`);
  });

  test("delete user", async () => {
    render(<UserUpdatePage></UserUpdatePage>);
    expect(await screen.findByRole("heading", { level: 2, name: "Details van het account" })).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Gebruiker verwijderen" }));
    expect(await screen.findByRole("dialog")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Verwijderen" }));

    const expectedMessage = "Het account van Sanne Molenaar is verwijderd";
    expect(navigate).toHaveBeenCalledExactlyOnceWith(`/users?deleted=${encodeURIComponent(expectedMessage)}`, {
      replace: true,
    });
  });

  test("delete button should not be visible if its the user itself", async () => {
    // Mock logged-in user as admin with user_id 1
    vi.spyOn(useUser, "useUser").mockReturnValue({ ...getAdminUser(), user_id: 1 });

    render(<UserUpdatePage></UserUpdatePage>);
    await screen.findByRole("heading", { level: 2, name: "Details van het account" });

    expect(screen.queryByRole("button", { name: "Gebruiker verwijderen" })).not.toBeInTheDocument();
  });

  test("delete button should be visible if its a different user", async () => {
    // Mock logged-in user as admin with user_id 2
    vi.spyOn(useUser, "useUser").mockReturnValue({ ...getAdminUser(), user_id: 2 });

    render(<UserUpdatePage></UserUpdatePage>);
    await screen.findByRole("heading", { level: 2, name: "Details van het account" });

    expect(screen.queryByRole("button", { name: "Gebruiker verwijderen" })).toBeInTheDocument();
  });

  test("Authorization error should be shown when insufficient rights", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    overrideOnce("get", "/api/users/1", 403, { error: "Forbidden", fatal: true, reference: "Forbidden" });

    render(<UserUpdatePage></UserUpdatePage>);

    await waitFor(() => {
      expect(screen.getByText("Error thrown during render: Forbidden")).toBeVisible();
    });
  });
});
