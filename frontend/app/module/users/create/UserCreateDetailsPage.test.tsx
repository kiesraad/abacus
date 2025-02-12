import { within } from "@testing-library/dom";
import { screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";

import { UserCreateDetailsPage } from "app/module/users";

import { ApiError, ApiResponseStatus, ApiResult, User } from "@kiesraad/api";
import { render } from "@kiesraad/test";

import { IUserCreateContext, UserCreateContext } from "./UserCreateContext";

const navigate = vi.fn();
const createUser = vi.fn();

vi.mock(import("react-router"), async (importOriginal) => ({
  ...(await importOriginal()),
  Navigate: ({ to }) => {
    navigate(to);
    return null;
  },
  useNavigate: () => navigate,
}));

const API_ERROR_NOT_UNIQUE = new ApiError(ApiResponseStatus.ServerError, 409, "Item is not unique", "EntryNotUnique");

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

  test("Show validation errors", async () => {
    renderPage({ role: "coordinator", type: "fullname" });

    const user = userEvent.setup();

    const submit = await screen.findByRole("button", { name: "Opslaan" });
    await user.click(submit);

    const username = await screen.findByLabelText("Gebruikersnaam");
    expect(username).toBeInvalid();
    expect(username).toHaveAccessibleErrorMessage("Dit veld mag niet leeg zijn");

    const fullname = await screen.findByLabelText("Volledige naam");
    expect(fullname).toBeInvalid();
    expect(fullname).toHaveAccessibleErrorMessage("Dit veld mag niet leeg zijn");

    const password = await screen.findByLabelText("Tijdelijk wachtwoord");
    expect(password).toBeInvalid();
    expect(password).toHaveAccessibleErrorMessage("Dit veld mag niet leeg zijn");

    await user.type(password, "mand");
    await user.click(submit);

    expect(password).toBeInvalid();
    expect(password).toHaveAccessibleErrorMessage("Dit wachtwoord is niet lang genoeg. Gebruik minimaal 12 karakters");
  });

  test("Do not return to user list if the create is unsuccessful", async () => {
    createUser.mockResolvedValue(API_ERROR_NOT_UNIQUE satisfies ApiResult<User>);

    renderPage({ role: "typist", type: "anonymous", createUser });

    const user = userEvent.setup();
    await user.type(await screen.findByLabelText("Gebruikersnaam"), "NieuweGebruiker");
    await user.type(await screen.findByLabelText("Tijdelijk wachtwoord"), "Wachtwoord12");
    await user.click(await screen.findByRole("button", { name: "Opslaan" }));

    expect(createUser).toHaveBeenCalledExactlyOnceWith({
      username: "NieuweGebruiker",
      temp_password: "Wachtwoord12",
    });

    expect(navigate).not.toHaveBeenCalled();
  });

  test("Show api error", async () => {
    renderPage({ role: "typist", type: "anonymous", apiError: API_ERROR_NOT_UNIQUE, username: "dubbel" });

    const user = userEvent.setup();
    const username = await screen.findByLabelText("Gebruikersnaam");
    const password = await screen.findByLabelText("Tijdelijk wachtwoord");

    const alert = await screen.findByRole("alert");
    expect(alert).toBeInTheDocument();

    const errorMessage = "Er bestaat al een gebruiker met gebruikersnaam dubbel";
    expect(within(alert).getByText(errorMessage)).toBeInTheDocument();
    expect(within(alert).getByText("De gebruikersnaam moet uniek zijn")).toBeInTheDocument();

    expect(username).toBeInvalid();
    expect(username).toHaveAccessibleErrorMessage(errorMessage);

    // Do not show error when there are validation errors
    await user.type(username, "dubbel");
    await user.type(password, "mand");
    await user.click(await screen.findByRole("button", { name: "Opslaan" }));

    expect(password).toBeInvalid();
    expect(password).toHaveAccessibleErrorMessage(/Dit wachtwoord is niet lang genoeg/);

    expect(alert).not.toBeInTheDocument();
    expect(username).not.toBeInvalid();
    expect(username).not.toHaveAccessibleErrorMessage(errorMessage);
  });

  test("Navigate to user list after submitting fullname fields", async () => {
    createUser.mockResolvedValue({
      status: ApiResponseStatus.Success,
      code: 200,
      data: { username: "NieuweGebruiker", role: "coordinator" } as User,
    } satisfies ApiResult<User>);

    renderPage({ role: "coordinator", type: "fullname", createUser });

    const user = userEvent.setup();
    await user.type(await screen.findByLabelText("Gebruikersnaam"), "NieuweGebruiker");
    await user.type(await screen.findByLabelText("Volledige naam"), "Nieuwe Gebruiker");
    await user.type(await screen.findByLabelText("Tijdelijk wachtwoord"), "Wachtwoord12");
    await user.click(await screen.findByRole("button", { name: "Opslaan" }));

    expect(createUser).toHaveBeenCalledExactlyOnceWith({
      username: "NieuweGebruiker",
      fullname: "Nieuwe Gebruiker",
      temp_password: "Wachtwoord12",
    });

    const message = "NieuweGebruiker is toegevoegd met de rol Coördinator";
    expect(navigate).toHaveBeenCalledExactlyOnceWith(`/users?created=${encodeURIComponent(message)}`);
  });

  test("Navigate to user list after submitting anonymous fields", async () => {
    createUser.mockResolvedValue({
      status: ApiResponseStatus.Success,
      code: 200,
      data: { username: "NieuweGebruiker", role: "typist" } as User,
    } satisfies ApiResult<User>);

    renderPage({ role: "typist", type: "anonymous", createUser });

    const user = userEvent.setup();

    expect(await screen.findByLabelText("Gebruikersnaam")).toHaveValue("");
    expect(screen.queryByLabelText("Volledige naam")).not.toBeInTheDocument();
    expect(await screen.findByLabelText("Tijdelijk wachtwoord")).toHaveValue("");

    await user.type(await screen.findByLabelText("Gebruikersnaam"), "NieuweGebruiker");
    await user.type(await screen.findByLabelText("Tijdelijk wachtwoord"), "Wachtwoord12");

    const submit = await screen.findByRole("button", { name: "Opslaan" });
    await user.click(submit);

    expect(createUser).toHaveBeenCalledExactlyOnceWith({
      username: "NieuweGebruiker",
      temp_password: "Wachtwoord12",
    });

    const message = "NieuweGebruiker is toegevoegd met de rol Invoerder";
    expect(navigate).toHaveBeenCalledExactlyOnceWith(`/users?created=${encodeURIComponent(message)}`);
  });
});
