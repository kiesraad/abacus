import { screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";

import { UserCreateDetailsPage } from "app/module/users";

import { render } from "@kiesraad/test";

import { IUserCreateContext, UserCreateContext } from "./UserCreateContext";

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
    renderPage({ user: {} });
    expect(navigate).toHaveBeenCalledExactlyOnceWith("/users/create");
  });

  test("Show and fill fullname fields", async () => {
    const updateUser = vi.fn();
    renderPage({ user: { role: "typist", type: "fullname" }, updateUser });

    const user = userEvent.setup();

    expect(await screen.findByLabelText("Gebruikersnaam")).toHaveValue("");
    expect(await screen.findByLabelText("Volledige naam")).toHaveValue("");
    expect(await screen.findByLabelText("Tijdelijk wachtwoord")).toHaveValue("");

    await user.type(await screen.findByLabelText("Gebruikersnaam"), "NieuweGebruiker");
    await user.type(await screen.findByLabelText("Volledige naam"), "Nieuwe Gebruiker");
    await user.type(await screen.findByLabelText("Tijdelijk wachtwoord"), "geheim123");

    const submit = await screen.findByRole("button", { name: "Opslaan" });
    await user.click(submit);

    expect(updateUser).toHaveBeenCalledExactlyOnceWith({
      username: "NieuweGebruiker",
      fullname: "Nieuwe Gebruiker",
      password: "geheim123",
    });
    expect(navigate).toHaveBeenCalledExactlyOnceWith("/users");
  });

  test("Continue after filling in anonymous fields", async () => {
    const updateUser = vi.fn();
    renderPage({ user: { role: "typist", type: "anonymous" }, updateUser });

    const user = userEvent.setup();

    expect(await screen.findByLabelText("Gebruikersnaam")).toHaveValue("");
    expect(screen.queryByLabelText("Volledige naam")).not.toBeInTheDocument();
    expect(await screen.findByLabelText("Tijdelijk wachtwoord")).toHaveValue("");

    await user.type(await screen.findByLabelText("Gebruikersnaam"), "NieuweGebruiker");
    await user.type(await screen.findByLabelText("Tijdelijk wachtwoord"), "geheim123");

    const submit = await screen.findByRole("button", { name: "Opslaan" });
    await user.click(submit);

    expect(updateUser).toHaveBeenCalledExactlyOnceWith({
      username: "NieuweGebruiker",
      password: "geheim123",
    });
    expect(navigate).toHaveBeenCalledExactlyOnceWith("/users");
  });
});
