import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";

import { CreateFirstAdminRequestHandler } from "@/testing/api-mocks/RequestHandlers";
import { server } from "@/testing/server";
import { render, screen, spyOnHandler } from "@/testing/test-utils";

import { CreateFirstAdminForm } from "./CreateFirstAdminForm";

const next = vi.fn();

describe("CreateFirstAdminForm", () => {
  test("Create the first admin user", async () => {
    server.use(CreateFirstAdminRequestHandler);
    const createAdmin = spyOnHandler(CreateFirstAdminRequestHandler);

    render(<CreateFirstAdminForm next={next} />);

    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Jouw naam (roepnaam + achternaam)"), "First Last");
    await user.type(screen.getByLabelText("Gebruikersnaam"), "firstlast");
    await user.type(screen.getByLabelText("Kies een wachtwoord"), "password*password");
    await user.type(screen.getByLabelText("Herhaal wachtwoord"), "password*password");

    const submitButton = screen.getByRole("button", { name: "Opslaan" });
    await user.click(submitButton);

    expect(createAdmin).toHaveBeenCalledWith({
      username: "firstlast",
      fullname: "First Last",
      temp_password: "password*password",
      role: "administrator",
    });
    expect(next).toHaveBeenCalledOnce();
  });
});
