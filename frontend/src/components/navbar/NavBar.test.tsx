import { userEvent } from "@testing-library/user-event";
import { beforeEach, describe, expect, test } from "vitest";

import { ElectionProvider } from "@/api/election/ElectionProvider";
import { TestUserProvider } from "@/api/TestUserProvider";
import { ElectionRequestHandler } from "@/testing/api-mocks/RequestHandlers";
import { server } from "@/testing/server";
import { render, screen } from "@/testing/test-utils";
import { Role } from "@/types/generated/openapi";

import { NavBar } from "./NavBar";
import { NavBarLinks } from "./NavBarLinks";

async function renderNavBar(location: { pathname: string }, userRole: Role) {
  render(
    <TestUserProvider userRole={userRole}>
      <ElectionProvider electionId={1}>
        <NavBar location={location} />
      </ElectionProvider>
    </TestUserProvider>,
  );

  // wait for the NavBar to be rendered
  expect(await screen.findByLabelText("primary-navigation")).toBeInTheDocument();
}

function renderNavBarLinks(location: { pathname: string }) {
  render(
    <ElectionProvider electionId={1}>
      <NavBarLinks location={location} />
    </ElectionProvider>,
  );
}

describe("NavBar", () => {
  beforeEach(() => {
    server.use(ElectionRequestHandler);
  });

  test.each([
    { pathname: "/account/login" },
    { pathname: "/account/setup" },
    { pathname: "/elections" },
    { pathname: "/elections/1" },
    { pathname: "/invalid-notfound" },
  ])("no links for $pathname", (location) => {
    renderNavBarLinks(location);

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  test("elections link and current election name for '/elections/1/data-entry'", async () => {
    await renderNavBar({ pathname: "/elections/1/data-entry" }, "typist");

    expect(screen.queryByRole("link", { name: "Verkiezingen" })).toBeVisible();
    expect(
      screen.queryByRole("link", { name: "Heemdamseburg — Gemeenteraadsverkiezingen 2026" }),
    ).not.toBeInTheDocument();

    expect(screen.queryByText("Heemdamseburg")).toBeVisible();
    expect(screen.queryByText("Gemeenteraadsverkiezingen 2026")).toBeVisible();
  });

  test.each([
    { pathname: "/elections/1/data-entry/1/1" },
    { pathname: "/elections/1/data-entry/1/1/recounted" },
    { pathname: "/elections/1/data-entry/1/1/voters-and-votes" },
    { pathname: "/elections/1/data-entry/1/1/list/1" },
    { pathname: "/elections/1/data-entry/1/1/save" },
  ])("elections link and current election link for $pathname", async (location) => {
    await renderNavBar(location, "typist");

    expect(screen.queryByRole("link", { name: "Verkiezingen" })).toBeVisible();
    expect(screen.queryByRole("link", { name: "Heemdamseburg — Gemeenteraadsverkiezingen 2026" })).toBeVisible();
  });

  test.each([
    { pathname: "/elections" },
    { pathname: "/users" },
    { pathname: "/users" },
    { pathname: "/users/create" },
    { pathname: "/users/create/details" },
    { pathname: "/workstations" },
    { pathname: "/logs" },
    { pathname: "/elections/1" },
    { pathname: "/elections/create" },
  ])("top level management links for $pathname", async (location) => {
    await renderNavBar(location, "administrator");

    expect(screen.queryByRole("link", { name: "Verkiezingen" })).toBeVisible();
    expect(screen.queryByRole("link", { name: "Gebruikers" })).toBeVisible();
    expect(screen.queryByRole("link", { name: "Werkplekken" })).toBeVisible();
    expect(screen.queryByRole("link", { name: "Logs" })).toBeVisible();
  });

  test.each([
    { pathname: "/elections/1/report" },
    { pathname: "/elections/1/status" },
    { pathname: "/elections/1/polling-stations" },
    { pathname: "/elections/1/apportionment" },
  ])("election management links for $pathname", async (location) => {
    await renderNavBar(location, "coordinator");

    expect(screen.queryByRole("link", { name: "Verkiezingen" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Heemdamseburg — Gemeenteraadsverkiezingen 2026" })).toBeVisible();
  });

  test.each([
    { pathname: "/elections/1/polling-stations/create" },
    { pathname: "/elections/1/polling-stations/1/update" },
  ])("polling station management links for $pathname", async (location) => {
    await renderNavBar(location, "coordinator");

    expect(screen.queryByRole("link", { name: "Verkiezingen" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Heemdamseburg — Gemeenteraadsverkiezingen 2026" })).toBeVisible();
    expect(screen.queryByRole("link", { name: "Stembureaus" })).toBeVisible();
  });

  test.each([
    { pathname: "/elections/1/apportionment/1" },
    { pathname: "/elections/1/apportionment/details-full-seats" },
    { pathname: "/elections/1/apportionment/details-residual-seats" },
  ])("polling station management links for $pathname", async (location) => {
    await renderNavBar(location, "coordinator");

    expect(screen.queryByRole("link", { name: "Verkiezingen" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Heemdamseburg — Gemeenteraadsverkiezingen 2026" })).toBeVisible();
    expect(screen.queryByRole("link", { name: "Zetelverdeling" })).toBeVisible();
  });

  test.each([
    { pathname: "/elections/1/report" },
    { pathname: "/elections/1/status" },
    { pathname: "/elections/1/polling-stations" },
    { pathname: "/elections/1/polling-stations/create" },
    { pathname: "/elections/1/polling-stations/1/update" },
    { pathname: "/elections/1/apportionment/details-full-seats" },
    { pathname: "/elections/1/apportionment/details-residual-seats" },
  ])("menu works for $pathname", async (location) => {
    const user = userEvent.setup();
    await renderNavBar(location, "administrator");

    const menuButton = screen.getByRole("button", { name: "Menu" });
    expect(menuButton).toBeVisible();

    // menu should be invisible
    expect(screen.queryByRole("link", { name: "Verkiezingen" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Gebruikers" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Werkplekken" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Logs" })).not.toBeInTheDocument();

    // menu should be visible after clicking button
    await user.click(menuButton);
    expect(screen.queryByRole("link", { name: "Verkiezingen" })).toBeVisible();
    expect(screen.queryByRole("link", { name: "Gebruikers" })).toBeVisible();
    expect(screen.queryByRole("link", { name: "Werkplekken" })).toBeVisible();
    expect(screen.queryByRole("link", { name: "Logs" })).toBeVisible();

    // menu should hide after clicking outside it
    await user.click(document.body);
    expect(screen.queryByRole("link", { name: "Verkiezingen" })).not.toBeInTheDocument();
  });
});
