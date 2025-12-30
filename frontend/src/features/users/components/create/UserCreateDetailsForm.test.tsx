import { userEvent } from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { UserCreateRequestHandler } from "@/testing/api-mocks/RequestHandlers";
import { userMockData } from "@/testing/api-mocks/UserMockData";
import { overrideOnce, server } from "@/testing/server";
import { render, screen, spyOnHandler, within } from "@/testing/test-utils";
import type { Role, USER_CREATE_REQUEST_PATH } from "@/types/generated/openapi";

import { UserCreateDetailsForm } from "./UserCreateDetailsForm";

function renderForm(role: Role, showFullname: boolean) {
  const onSubmitted = vi.fn();
  render(<UserCreateDetailsForm role={role} showFullname={showFullname} onSubmitted={onSubmitted} />);
  return { onSubmitted };
}

describe("UserCreateDetailsForm", () => {
  beforeEach(() => {
    server.use(UserCreateRequestHandler);
  });

  test("Render empty form", async () => {
    renderForm("coordinator", true);

    expect(await screen.findByRole("textbox", { name: "Gebruikersnaam" })).toHaveValue("");
    expect(await screen.findByRole("textbox", { name: "Volledige naam" })).toHaveValue("");
    expect(await screen.findByLabelText("Tijdelijk wachtwoord")).toHaveValue("");
  });

  test("Show validation errors", async () => {
    renderForm("coordinator", true);

    const user = userEvent.setup();

    const submit = await screen.findByRole("button", { name: "Opslaan" });
    await user.click(submit);

    const username = await screen.findByRole("textbox", { name: "Gebruikersnaam" });
    expect(username).toBeInvalid();
    expect(username).toHaveAccessibleErrorMessage("Dit veld mag niet leeg zijn");

    const fullname = await screen.findByRole("textbox", { name: "Volledige naam" });
    expect(fullname).toBeInvalid();
    expect(fullname).toHaveAccessibleErrorMessage("Dit veld mag niet leeg zijn");

    const password = await screen.findByLabelText("Tijdelijk wachtwoord");
    expect(password).toBeInvalid();
    expect(password).toHaveAccessibleErrorMessage("Dit veld mag niet leeg zijn");
  });

  test("Show username must be unique error", async () => {
    overrideOnce("post", "/api/users" satisfies USER_CREATE_REQUEST_PATH, 409, {
      error: "Username already exists",
      fatal: false,
      reference: "UsernameNotUnique",
    });

    const { onSubmitted } = renderForm("typist", false);

    const user = userEvent.setup();
    const username = await screen.findByRole("textbox", { name: "Gebruikersnaam" });
    const password = await screen.findByLabelText("Tijdelijk wachtwoord");

    await user.type(username, "Dubbel");
    await user.type(password, "Wachtwoord123");
    await user.click(await screen.findByRole("button", { name: "Opslaan" }));

    const alert = await screen.findByRole("alert");
    expect(within(alert).getByRole("strong")).toHaveTextContent(
      "Er bestaat al een gebruiker met gebruikersnaam Dubbel",
    );
    expect(within(alert).getByRole("paragraph")).toHaveTextContent("De gebruikersnaam moet uniek zijn");

    expect(username).toBeInvalid();
    expect(username).toHaveAccessibleErrorMessage("De gebruikersnaam moet uniek zijn");
    expect(onSubmitted).not.toHaveBeenCalled();

    // Do not show error when there are validation errors
    await user.clear(password);
    await user.click(await screen.findByRole("button", { name: "Opslaan" }));

    expect(password).toBeInvalid();
    expect(password).toHaveAccessibleErrorMessage("Dit veld mag niet leeg zijn");

    expect(alert).not.toBeInTheDocument();
    expect(username).not.toBeInvalid();
    expect(username).not.toHaveAccessibleErrorMessage();
    expect(onSubmitted).not.toHaveBeenCalled();
  });

  test("Call onSubmitted after submitting fullname fields", async () => {
    const { onSubmitted } = renderForm("coordinator", true);
    const createUser = spyOnHandler(UserCreateRequestHandler);

    const user = userEvent.setup();
    await user.type(await screen.findByRole("textbox", { name: "Gebruikersnaam" }), "NieuweGebruiker");
    await user.type(await screen.findByRole("textbox", { name: "Volledige naam" }), "Nieuwe Gebruiker");
    await user.type(await screen.findByLabelText("Tijdelijk wachtwoord"), "Wachtwoord12");
    await user.click(await screen.findByRole("button", { name: "Opslaan" }));

    expect(createUser).toHaveBeenCalledExactlyOnceWith({
      role: "coordinator",
      username: "NieuweGebruiker",
      fullname: "Nieuwe Gebruiker",
      temp_password: "Wachtwoord12",
    });
    expect(onSubmitted).toHaveBeenCalledExactlyOnceWith(userMockData[0]);
  });

  test("Call onSubmitted after submitting anonymous fields", async () => {
    const { onSubmitted } = renderForm("typist", false);
    const createUser = spyOnHandler(UserCreateRequestHandler);

    const user = userEvent.setup();

    expect(await screen.findByRole("textbox", { name: "Gebruikersnaam" })).toHaveValue("");
    expect(screen.queryByRole("textbox", { name: "Volledige naam" })).not.toBeInTheDocument();
    expect(await screen.findByLabelText("Tijdelijk wachtwoord")).toHaveValue("");

    await user.type(await screen.findByRole("textbox", { name: "Gebruikersnaam" }), "NieuweGebruiker");
    await user.type(await screen.findByLabelText("Tijdelijk wachtwoord"), "Wachtwoord12");

    const submit = await screen.findByRole("button", { name: "Opslaan" });
    await user.click(submit);

    expect(createUser).toHaveBeenCalledExactlyOnceWith({
      role: "typist",
      username: "NieuweGebruiker",
      temp_password: "Wachtwoord12",
    });
    expect(onSubmitted).toHaveBeenCalledExactlyOnceWith(userMockData[0]);
  });
});
