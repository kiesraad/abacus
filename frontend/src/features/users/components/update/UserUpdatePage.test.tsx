import { userEvent } from "@testing-library/user-event";
import * as ReactRouter from "react-router";
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { iMessageContext } from "@/hooks/messages/MessagesContext";
import { MessagesProvider } from "@/hooks/messages/MessagesProvider";
import * as useMessages from "@/hooks/messages/useMessages";
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

async function renderPage() {
  render(
    <MessagesProvider>
      <UserUpdatePage />
    </MessagesProvider>,
  );

  expect(await screen.findByRole("heading", { level: 2, name: "Details van het account" })).toBeInTheDocument();
}

describe("UserUpdatePage", () => {
  const pushMessage = vi.fn();
  const navigate = vi.fn();

  beforeEach(() => {
    server.use(UserGetRequestHandler, UserUpdateRequestHandler, UserDeleteRequestHandler);
    vi.spyOn(useMessages, "useMessages").mockReturnValue({ pushMessage } as unknown as iMessageContext);
    vi.spyOn(ReactRouter, "useNavigate").mockImplementation(() => navigate);
    vi.spyOn(ReactRouter, "useParams").mockReturnValue({ userId: "1" });
  });

  test("update user", async () => {
    await renderPage();

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Wijzigingen opslaan" }));

    expect(pushMessage).toHaveBeenCalledWith({
      title: "Wijzigingen opgeslagen",
      text: "De wijzigingen in het account van Sanne Molenaar zijn opgeslagen",
    });
    expect(navigate).toHaveBeenCalledExactlyOnceWith("/users");
  });

  test("delete user", async () => {
    await renderPage();

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Gebruiker verwijderen" }));
    expect(await screen.findByRole("dialog")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Verwijderen" }));

    expect(pushMessage).toHaveBeenCalledWith({
      title: "Gebruiker verwijderd",
      text: "Het account van Sanne Molenaar is verwijderd",
    });
    expect(navigate).toHaveBeenCalledExactlyOnceWith("/users", { replace: true });
  });

  test("delete button should not be visible if its the user itself", async () => {
    vi.spyOn(useUser, "useUser").mockReturnValue({ ...getAdminUser(), user_id: 1 });
    await renderPage();
    expect(screen.queryByRole("button", { name: "Gebruiker verwijderen" })).not.toBeInTheDocument();
  });

  test("delete button should be visible if its a different user", async () => {
    vi.spyOn(useUser, "useUser").mockReturnValue({ ...getAdminUser(), user_id: 2 });
    await renderPage();
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
