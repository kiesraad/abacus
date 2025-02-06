import { screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";

import { UserCreateTypePage } from "app/module/users";

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
      <UserCreateTypePage />
    </UserCreateContext.Provider>,
  );
}

describe("UserCreateTypePage", () => {
  test("Redirect to start when no role in context", () => {
    renderPage({ user: {} });
    expect(navigate).toHaveBeenCalledExactlyOnceWith("/users/create");
  });

  test("Shows initial form", async () => {
    renderPage({ user: { role: "typist" } });

    expect(await screen.findByLabelText(/Op naam/)).toBeChecked();
    expect(await screen.findByLabelText(/Anonieme gebruikersnaam/)).not.toBeChecked();
  });

  test("Shows form previously selected", async () => {
    renderPage({ user: { role: "typist", type: "anonymous" } });

    expect(await screen.findByLabelText(/Op naam/)).not.toBeChecked();
    expect(await screen.findByLabelText(/Anonieme gebruikersnaam/)).toBeChecked();
  });

  test("Continue after selecting fullname", async () => {
    const updateUser = vi.fn();
    renderPage({ user: { role: "typist" }, updateUser });

    const user = userEvent.setup();

    const fullname = await screen.findByLabelText(/Op naam/);
    await user.click(fullname);

    const submit = await screen.findByRole("button", { name: "Verder" });
    await user.click(submit);

    expect(updateUser).toHaveBeenCalledExactlyOnceWith({ type: "fullname" });
    expect(navigate).toHaveBeenCalledExactlyOnceWith("/users/create/details");
  });

  test("Continue after selecting anonymous", async () => {
    const updateUser = vi.fn();
    renderPage({ user: { role: "typist" }, updateUser });

    const user = userEvent.setup();

    const anonymous = await screen.findByLabelText(/Anonieme gebruikersnaam/);
    await user.click(anonymous);

    const submit = await screen.findByRole("button", { name: "Verder" });
    await user.click(submit);

    expect(updateUser).toHaveBeenCalledExactlyOnceWith({ type: "anonymous" });
    expect(navigate).toHaveBeenCalledExactlyOnceWith("/users/create/details");
  });
});
