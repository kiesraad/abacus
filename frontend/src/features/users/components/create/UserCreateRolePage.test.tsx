import { userEvent } from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";

import { render, screen } from "@/testing/test-utils";

import { IUserCreateContext, UserCreateContext } from "../../hooks/UserCreateContext";
import { UserCreateRolePage } from "./UserCreateRolePage";

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
    renderPage({});

    expect(await screen.findByRole("heading", { level: 1, name: "Gebruiker toevoegen" })).toBeInTheDocument();

    expect(await screen.findByLabelText(/Beheerder/)).not.toBeChecked();
    expect(await screen.findByLabelText(/Coördinator/)).not.toBeChecked();
    expect(await screen.findByLabelText(/Invoerder/)).not.toBeChecked();
  });

  test("Shows form previously selected", async () => {
    renderPage({ role: "typist" });

    expect(await screen.findByLabelText(/Beheerder/)).not.toBeChecked();
    expect(await screen.findByLabelText(/Coördinator/)).not.toBeChecked();
    expect(await screen.findByLabelText(/Invoerder/)).toBeChecked();
  });

  test("Shows validation error when nothing selected", async () => {
    const setRole = vi.fn();
    renderPage({ setRole });

    const user = userEvent.setup();

    const submit = await screen.findByRole("button", { name: "Verder" });
    await user.click(submit);

    const errorMessage = screen.getByText(/Dit is een verplichte vraag./);
    expect(errorMessage).toBeInTheDocument();

    expect(setRole).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  test("Continue with administrator", async () => {
    const setRole = vi.fn();
    const setType = vi.fn();
    renderPage({ setRole, setType });

    const user = userEvent.setup();
    await user.click(await screen.findByLabelText(/Beheerder/));
    await user.click(await screen.findByRole("button", { name: "Verder" }));

    expect(setRole).toHaveBeenCalledExactlyOnceWith("administrator");
    expect(setType).toHaveBeenCalledExactlyOnceWith("fullname");
    expect(navigate).toHaveBeenCalledExactlyOnceWith("/users/create/details");
  });

  test("Continue with coordinator", async () => {
    const setRole = vi.fn();
    const setType = vi.fn();
    renderPage({ setRole, setType });

    const user = userEvent.setup();
    await user.click(await screen.findByLabelText(/Coördinator/));
    await user.click(await screen.findByRole("button", { name: "Verder" }));

    expect(setRole).toHaveBeenCalledExactlyOnceWith("coordinator");
    expect(setType).toHaveBeenCalledExactlyOnceWith("fullname");
    expect(navigate).toHaveBeenCalledExactlyOnceWith("/users/create/details");
  });

  test("Continue with typist", async () => {
    const setRole = vi.fn();
    const setType = vi.fn();
    renderPage({ setRole, setType });

    const user = userEvent.setup();
    await user.click(await screen.findByLabelText(/Invoerder/));
    await user.click(await screen.findByRole("button", { name: "Verder" }));

    expect(setRole).toHaveBeenCalledExactlyOnceWith("typist");
    expect(setType).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledExactlyOnceWith("/users/create/type");
  });
});
