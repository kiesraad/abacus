import { screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { UserGetRequestHandler, UserUpdateRequestHandler } from "@kiesraad/api-mocks";
import { render, server } from "@kiesraad/test";

import { UserUpdatePage } from "./UserUpdatePage";

const navigate = vi.fn();

vi.mock(import("@kiesraad/util"), async (importOriginal) => ({
  ...(await importOriginal()),
  useNumericParam: () => 1,
}));

vi.mock(import("react-router"), async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => navigate,
}));

describe("UserUpdatePage", () => {
  beforeEach(() => {
    server.use(UserGetRequestHandler, UserUpdateRequestHandler);
  });

  test("update user", async () => {
    render(<UserUpdatePage></UserUpdatePage>);
    expect(await screen.findByRole("heading", { name: "Details van het account" })).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Wijzigingen opslaan" }));

    const expectedMessage = "De wijzigingen in het account van Sanne zijn opgeslagen";
    expect(navigate).toHaveBeenCalledExactlyOnceWith(`/users?updated=${encodeURIComponent(expectedMessage)}`);
  });
});
