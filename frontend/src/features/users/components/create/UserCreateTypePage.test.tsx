import * as ReactRouter from "react-router";

import { userEvent } from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { render, screen } from "@/testing/test-utils";

import { IUserCreateContext, UserCreateContext } from "../../hooks/UserCreateContext";
import { UserCreateTypePage } from "./UserCreateTypePage";

const navigate = vi.fn();

function renderPage(context: Partial<IUserCreateContext>) {
  return render(
    <UserCreateContext.Provider value={context as IUserCreateContext}>
      <UserCreateTypePage />
    </UserCreateContext.Provider>,
  );
}

describe("UserCreateTypePage", () => {
  beforeEach(() => {
    vi.spyOn(ReactRouter, "useNavigate").mockImplementation(() => navigate);
    vi.spyOn(ReactRouter, "Navigate").mockImplementation((props) => {
      navigate(props.to);
      return null;
    });
  });

  test("Redirect to start when no role in context", () => {
    renderPage({});
    expect(navigate).toHaveBeenCalledExactlyOnceWith("/users/create");
  });

  test("Shows initial form", async () => {
    renderPage({ role: "typist" });

    expect(await screen.findByRole("heading", { level: 1, name: "Invoerder toevoegen" })).toBeInTheDocument();

    expect(await screen.findByLabelText(/Op naam/)).toBeChecked();
    expect(await screen.findByLabelText(/Anonieme gebruikersnaam/)).not.toBeChecked();
  });

  test("Shows form previously selected", async () => {
    renderPage({ role: "typist", type: "anonymous" });

    expect(await screen.findByLabelText(/Op naam/)).not.toBeChecked();
    expect(await screen.findByLabelText(/Anonieme gebruikersnaam/)).toBeChecked();
  });

  test("Continue after selecting fullname", async () => {
    const setType = vi.fn();
    renderPage({ role: "typist", setType });

    const user = userEvent.setup();

    const fullname = await screen.findByLabelText(/Op naam/);
    await user.click(fullname);

    const submit = await screen.findByRole("button", { name: "Verder" });
    await user.click(submit);

    expect(setType).toHaveBeenCalledExactlyOnceWith("fullname");
    expect(navigate).toHaveBeenCalledExactlyOnceWith("/users/create/details");
  });

  test("Continue after selecting anonymous", async () => {
    const setType = vi.fn();
    renderPage({ role: "typist", setType });

    const user = userEvent.setup();

    const anonymous = await screen.findByLabelText(/Anonieme gebruikersnaam/);
    await user.click(anonymous);

    const submit = await screen.findByRole("button", { name: "Verder" });
    await user.click(submit);

    expect(setType).toHaveBeenCalledExactlyOnceWith("anonymous");
    expect(navigate).toHaveBeenCalledExactlyOnceWith("/users/create/details");
  });
});
