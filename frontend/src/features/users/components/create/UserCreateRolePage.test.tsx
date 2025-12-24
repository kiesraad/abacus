import { userEvent } from "@testing-library/user-event";
import * as ReactRouter from "react-router";
import { beforeEach, describe, expect, test, vi } from "vitest";

import * as useUser from "@/hooks/user/useUser";
import { render, screen, waitFor } from "@/testing/test-utils";
import { getAdminUser, getCoordinatorUser } from "@/testing/user-mock-data";

import { IUserCreateContext, UserCreateContext } from "../../hooks/UserCreateContext";
import { UserCreateRolePage } from "./UserCreateRolePage";

const navigate = vi.fn();

function renderPage(context: Partial<IUserCreateContext>) {
  return render(
    <UserCreateContext.Provider value={context as IUserCreateContext}>
      <UserCreateRolePage />
    </UserCreateContext.Provider>,
  );
}

describe("UserCreateRolePage", () => {
  beforeEach(() => {
    vi.spyOn(ReactRouter, "useNavigate").mockImplementation(() => navigate);
    vi.spyOn(useUser, "useUser").mockReturnValue(getAdminUser());
  });

  test("Shows initial form", async () => {
    renderPage({});

    expect(await screen.findByRole("heading", { level: 1, name: "Gebruiker toevoegen" })).toBeInTheDocument();

    expect(await screen.findByRole("radio", { name: /Beheerder/ })).not.toBeChecked();
    expect(await screen.findByRole("radio", { name: /Coördinator/ })).not.toBeChecked();
    expect(await screen.findByRole("radio", { name: /Invoerder/ })).not.toBeChecked();
  });

  test("Shows form previously selected", async () => {
    renderPage({ role: "typist" });

    expect(await screen.findByRole("radio", { name: /Beheerder/ })).not.toBeChecked();
    expect(await screen.findByRole("radio", { name: /Coördinator/ })).not.toBeChecked();
    expect(await screen.findByRole("radio", { name: /Invoerder/ })).toBeChecked();
  });

  test("Shows validation error when nothing selected", async () => {
    const setRole = vi.fn();
    renderPage({ setRole });

    const user = userEvent.setup();

    const submit = await screen.findByRole("button", { name: "Verder" });
    await user.click(submit);

    const errorMessage = screen.getByText("Dit is een verplichte vraag. Maak een keuze uit de opties hieronder.");
    expect(errorMessage).toBeInTheDocument();

    expect(setRole).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  test("Continue with administrator", async () => {
    const setRole = vi.fn();
    const setType = vi.fn();
    renderPage({ setRole, setType });

    const user = userEvent.setup();
    await user.click(await screen.findByRole("radio", { name: /Beheerder/ }));
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
    await user.click(await screen.findByRole("radio", { name: /Coördinator/ }));
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
    await user.click(await screen.findByRole("radio", { name: /Invoerder/ }));
    await user.click(await screen.findByRole("button", { name: "Verder" }));

    expect(setRole).toHaveBeenCalledExactlyOnceWith("typist");
    expect(setType).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledExactlyOnceWith("/users/create/type");
  });

  test("Coordinator skips role selection", async () => {
    vi.spyOn(useUser, "useUser").mockReturnValue(getCoordinatorUser());

    const setRole = vi.fn();
    renderPage({ setRole });

    await waitFor(() => {
      expect(setRole).toHaveBeenCalledExactlyOnceWith("typist");
      expect(navigate).toHaveBeenCalledExactlyOnceWith("/users/create/type");
    });
  });
});
