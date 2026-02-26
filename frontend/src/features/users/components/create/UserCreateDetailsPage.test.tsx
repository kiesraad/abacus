import { waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import * as ReactRouter from "react-router";
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { iMessageContext } from "@/hooks/messages/MessagesContext";
import { MessagesProvider } from "@/hooks/messages/MessagesProvider";
import * as useMessages from "@/hooks/messages/useMessages";
import { overrideOnce } from "@/testing/server";
import { render, screen } from "@/testing/test-utils";
import type { USER_CREATE_REQUEST_PATH, User } from "@/types/generated/openapi";
import { type IUserCreateContext, UserCreateContext } from "../../hooks/UserCreateContext";
import { UserCreateDetailsPage } from "./UserCreateDetailsPage";

function renderPage(context: Partial<IUserCreateContext>) {
  return render(
    <MessagesProvider>
      <UserCreateContext.Provider value={context as IUserCreateContext}>
        <UserCreateDetailsPage />
      </UserCreateContext.Provider>
    </MessagesProvider>,
  );
}

describe("UserCreateDetailsPage", () => {
  const pushMessage = vi.fn();
  const navigate = vi.fn();

  beforeEach(() => {
    vi.spyOn(useMessages, "useMessages").mockReturnValue({ pushMessage } as unknown as iMessageContext);
    vi.spyOn(ReactRouter, "useNavigate").mockImplementation(() => navigate);
    vi.spyOn(ReactRouter, "Navigate").mockImplementation((props) => {
      navigate(props.to);
      return null;
    });
  });

  test("Redirect to start when no role in context", async () => {
    renderPage({});

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledExactlyOnceWith("/users/create");
    });
  });

  test("Render empty form", async () => {
    renderPage({ role: "coordinator_gsb", type: "fullname" });

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Coördinator gemeentelijk stembureau (GSB) toevoegen",
      }),
    ).toBeInTheDocument();

    expect(await screen.findByRole("textbox", { name: "Gebruikersnaam" })).toHaveValue("");
    expect(await screen.findByRole("textbox", { name: "Volledige naam" })).toHaveValue("");
    expect(await screen.findByRole("textbox", { name: "Tijdelijk wachtwoord" })).toHaveValue("");
  });

  test("Navigate to user list after submitting", async () => {
    overrideOnce("post", "/api/users" satisfies USER_CREATE_REQUEST_PATH, 201, {
      role: "coordinator_gsb",
      username: "NieuweGebruiker",
    } satisfies Partial<User>);

    renderPage({ role: "coordinator_gsb", type: "fullname" });

    const user = userEvent.setup();
    await user.type(await screen.findByRole("textbox", { name: "Gebruikersnaam" }), "NieuweGebruiker");
    await user.type(await screen.findByRole("textbox", { name: "Volledige naam" }), "Nieuwe Gebruiker");
    await user.type(await screen.findByRole("textbox", { name: "Tijdelijk wachtwoord" }), "Wachtwoord12");
    await user.click(await screen.findByRole("button", { name: "Opslaan" }));

    expect(pushMessage).toHaveBeenCalledWith({
      title: "Gebruiker toegevoegd",
      text: "NieuweGebruiker is toegevoegd met de rol Coördinator gemeentelijk stembureau (GSB)",
    });
    expect(navigate).toHaveBeenCalledExactlyOnceWith("/users");
  });
});
