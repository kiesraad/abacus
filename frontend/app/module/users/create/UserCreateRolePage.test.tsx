import { screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";

import { UserCreateRolePage } from "app/module/users";

import { render } from "@kiesraad/test";

import { IUserCreateContext, UserCreateContext } from "./UserCreateContext";

const navigate = vi.fn();

vi.mock(import("react-router"), async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => navigate,
}));

function renderPage(context: Partial<IUserCreateContext>) {
  return render(
    <UserCreateContext.Provider value={context as IUserCreateContext}>
      <UserCreateRolePage />
    </UserCreateContext.Provider>,
  );
}

describe("UserCreateRolePage", () => {
  test("Shows initial form", async () => {
    renderPage({ user: {} });

    expect(await screen.findByRole("heading", { level: 1, name: "Gebruiker toevoegen" })).toBeInTheDocument();

    expect(await screen.findByLabelText("Beheerder")).not.toBeChecked();
    expect(await screen.findByLabelText("Coördinator")).not.toBeChecked();
    expect(await screen.findByLabelText("Invoerder")).not.toBeChecked();
  });

  test("Shows form previously selected", async () => {
    renderPage({ user: { role: "typist" } });

    expect(await screen.findByLabelText("Beheerder")).not.toBeChecked();
    expect(await screen.findByLabelText("Coördinator")).not.toBeChecked();
    expect(await screen.findByLabelText("Invoerder")).toBeChecked();
  });

  test("Shows validation error when nothing selected", async () => {
    const updateUser = vi.fn();
    renderPage({ user: {}, updateUser });

    const user = userEvent.setup();

    const submit = await screen.findByRole("button", { name: "Verder" });
    await user.click(submit);

    const errorMessage = screen.getByText(/Dit is een verplichte vraag./);
    expect(errorMessage).toBeInTheDocument();

    expect(updateUser).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  test.each([
    ["Beheerder", { role: "administrator", type: "fullname" }, "/users/create/details"],
    ["Coördinator", { role: "coordinator", type: "fullname" }, "/users/create/details"],
    ["Invoerder", { role: "typist" }, "/users/create/type"],
  ])("Continue after selection as %s", async (label: string, update: unknown, newPath: string) => {
    const updateUser = vi.fn();
    renderPage({ user: {}, updateUser });

    const user = userEvent.setup();

    const role = await screen.findByLabelText(label);
    await user.click(role);

    const submit = await screen.findByRole("button", { name: "Verder" });
    await user.click(submit);

    expect(updateUser).toHaveBeenCalledExactlyOnceWith(update);
    expect(navigate).toHaveBeenCalledExactlyOnceWith(newPath);
  });
});
