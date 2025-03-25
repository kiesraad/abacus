import { within } from "@testing-library/dom";
import { render as rtlRender, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { beforeEach, describe, expect, test } from "vitest";

import { routes } from "@/routes";
import { overrideOnce, Providers, server, setupTestRouter } from "@/testing";
import { ElectionListRequestHandler, UserListRequestHandler } from "@/testing/api-mocks";

function renderWithRouter() {
  const router = setupTestRouter(routes);
  rtlRender(<Providers router={router} />);
  return router;
}

const rolePage = {
  radioGroup: () => screen.findByRole("group", { name: "Welke rol krijgt de nieuwe gebruiker?" }),
  administrator: () => screen.getByLabelText(/Beheerder/),
  coordinator: () => screen.getByLabelText(/Coördinator/),
  typist: () => screen.getByLabelText(/Invoerder/),
  continue: () => screen.getByRole("button", { name: "Verder" }),
};

const typePage = {
  radioGroup: () => screen.findByRole("group", { name: "Type account" }),
  withName: () => screen.getByLabelText(/Op naam/),
  anonymous: () => screen.getByLabelText(/Anonieme gebruikersnaam/),
  continue: () => screen.getByRole("button", { name: "Verder" }),
};

const detailsPage = {
  title: () => screen.findByRole("heading", { name: "Details van het account" }),
  username: () => screen.getByLabelText("Gebruikersnaam"),
  fullname: () => screen.getByLabelText("Volledige naam"),
  fullnameQuery: () => screen.queryByLabelText("Volledige naam"),
  password: () => screen.getByLabelText("Tijdelijk wachtwoord"),
  save: () => screen.getByRole("button", { name: "Opslaan" }),
};

describe("User create pages integration test", () => {
  beforeEach(() => {
    server.use(ElectionListRequestHandler);
  });

  describe("Navigation and fullname presence", () => {
    test.each(["administrator", "coordinator"] as const)("For %s", async (role) => {
      const router = renderWithRouter();
      const user = userEvent.setup();

      await router.navigate("/users/create");

      await waitFor(rolePage.radioGroup);
      await user.click(rolePage[role]());
      await user.click(rolePage.continue());

      await waitFor(detailsPage.title);
      expect(detailsPage.fullname()).toBeInTheDocument();
    });

    test("For typist", async () => {
      const router = renderWithRouter();
      const user = userEvent.setup();

      await router.navigate("/users/create");

      await waitFor(rolePage.radioGroup);
      await user.click(rolePage.typist());
      await user.click(rolePage.continue());

      await waitFor(typePage.radioGroup);
      expect(typePage.withName()).toBeChecked();
      await user.click(typePage.continue());

      await waitFor(detailsPage.title);
      expect(detailsPage.fullname()).toBeInTheDocument();
      await router.navigate(-1);

      await waitFor(typePage.radioGroup);
      await user.click(typePage.anonymous());
      await user.click(typePage.continue());

      await waitFor(detailsPage.title);
      expect(detailsPage.fullnameQuery()).not.toBeInTheDocument();
    });
  });

  describe("Save user", () => {
    test("Successfully", async () => {
      server.use(UserListRequestHandler);
      overrideOnce("post", "/api/user", 201, {
        id: 10,
        username: "GuusGeluk",
        fullname: "Guus Geluk",
        role: "administrator",
      });

      const router = renderWithRouter();
      const user = userEvent.setup();

      await router.navigate("/users/create");

      await waitFor(rolePage.radioGroup);
      await user.click(rolePage.administrator());
      await user.click(rolePage.continue());

      await waitFor(detailsPage.title);
      await user.type(detailsPage.username(), "GuusGeluk");
      await user.type(detailsPage.fullname(), "Guus Geluk");
      await user.type(detailsPage.password(), "Geluksdubbeltje10");
      await user.click(detailsPage.save());

      expect(await screen.findByRole("heading", { name: "Gebruikersbeheer" })).toBeInTheDocument();
      const alert = screen.getByRole("alert");
      expect(within(alert).getByText("GuusGeluk is toegevoegd met de rol Beheerder")).toBeInTheDocument();
    });

    test("Showing a unique username error", async () => {
      overrideOnce("post", "/api/user", 409, {
        error: "Username already exists",
        fatal: false,
        reference: "UsernameNotUnique",
      });

      const router = renderWithRouter();
      const user = userEvent.setup();

      await router.navigate("/users/create");

      await waitFor(rolePage.radioGroup);
      await user.click(rolePage.administrator());
      await user.click(rolePage.continue());

      await waitFor(detailsPage.title);
      await user.type(detailsPage.username(), "GuusGeluk");
      await user.type(detailsPage.fullname(), "Guus Geluk");
      await user.type(detailsPage.password(), "Geluksdubbeltje10");
      await user.click(detailsPage.save());

      const alert = screen.getByRole("alert");
      expect(within(alert).getByText("Er bestaat al een gebruiker met gebruikersnaam GuusGeluk")).toBeInTheDocument();
      expect(await detailsPage.title()).toBeInTheDocument();
    });
  });
});
