import { userEvent } from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";

import { User, USER_CREATE_REQUEST_PATH } from "@/api";
import { overrideOnce } from "@/testing/server";
import { render, screen } from "@/testing/test-utils";

import { IUserCreateContext, UserCreateContext } from "../../hooks/UserCreateContext";
import { UserCreateDetailsPage } from "./UserCreateDetailsPage";

const navigate = vi.fn();

vi.mock(import("react-router"), async (importOriginal) => ({
  ...(await importOriginal()),
  Navigate: ({ to }) => {
    navigate(to);
    return null;
  },
  useNavigate: () => navigate,
}));

function renderPage(context: Partial<IUserCreateContext>) {
  return render(
    <UserCreateContext.Provider value={context as IUserCreateContext}>
      <UserCreateDetailsPage />
    </UserCreateContext.Provider>,
  );
}

describe("UserCreateDetailsPage", () => {
  test("Redirect to start when no role in context", () => {
    renderPage({});
    expect(navigate).toHaveBeenCalledExactlyOnceWith("/users/create");
  });

  test("Render empty form", async () => {
    renderPage({ role: "coordinator", type: "fullname" });

    expect(await screen.findByRole("heading", { level: 1, name: "Coördinator toevoegen" })).toBeInTheDocument();

    expect(await screen.findByLabelText("Gebruikersnaam")).toHaveValue("");
    expect(await screen.findByLabelText("Volledige naam")).toHaveValue("");
    expect(await screen.findByLabelText("Tijdelijk wachtwoord")).toHaveValue("");
  });

  test("Navigate to user list after submitting", async () => {
    overrideOnce("post", "/api/user" satisfies USER_CREATE_REQUEST_PATH, 201, {
      role: "coordinator",
      username: "NieuweGebruiker",
    } satisfies Partial<User>);

    renderPage({ role: "coordinator", type: "fullname" });

    const user = userEvent.setup();
    await user.type(await screen.findByLabelText("Gebruikersnaam"), "NieuweGebruiker");
    await user.type(await screen.findByLabelText("Volledige naam"), "Nieuwe Gebruiker");
    await user.type(await screen.findByLabelText("Tijdelijk wachtwoord"), "Wachtwoord12");
    await user.click(await screen.findByRole("button", { name: "Opslaan" }));

    const message = "NieuweGebruiker is toegevoegd met de rol Coördinator";
    expect(navigate).toHaveBeenCalledExactlyOnceWith(`/users?created=${encodeURIComponent(message)}`);
  });
});
