import * as ReactRouter from "react-router";

import { userEvent } from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

import {
  UserDeleteRequestHandler,
  UserGetRequestHandler,
  UserUpdateRequestHandler,
} from "@/testing/api-mocks/RequestHandlers";
import { server } from "@/testing/server";
import { render, screen } from "@/testing/test-utils";

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
    expect(navigate).toHaveBeenCalledExactlyOnceWith(`/users?deleted=${encodeURIComponent(expectedMessage)}`);
  });
});
