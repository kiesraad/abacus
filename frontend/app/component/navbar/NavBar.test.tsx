import { userEvent } from "@testing-library/user-event";
import { beforeEach, describe, expect, test } from "vitest";

import { ElectionProvider } from "@kiesraad/api";
import { ElectionRequestHandler } from "@kiesraad/api-mocks";
import { render, screen, server } from "@kiesraad/test";

import { NavBar } from "./NavBar";
import { NavBarLinks } from "./NavBarLinks";

async function renderNavBar(location: { pathname: string; hash: string }) {
  render(
    <ElectionProvider electionId={1}>
      <NavBar location={location} />
    </ElectionProvider>,
  );

  // wait for the NavBar to be rendered
  expect(await screen.findByLabelText("primary-navigation")).toBeInTheDocument();
}

function renderNavBarLinks(location: { pathname: string; hash: string }) {
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
    { pathname: "/account/login", hash: "" },
    { pathname: "/account/setup", hash: "" },
    { pathname: "/elections", hash: "" },
    { pathname: "/elections/1", hash: "" },
    { pathname: "/invalid-notfound", hash: "" },
  ])("no links for $pathname", async (location) => {
    await renderNavBarLinks(location);

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  test("elections link and current election name for '/elections/1/data-entry'", async () => {
    await renderNavBar({ pathname: "/elections/1/data-entry", hash: "" });

    expect(screen.queryByRole("link", { name: "Verkiezingen" })).toBeVisible();
    expect(
      screen.queryByRole("link", { name: "Heemdamseburg — Gemeenteraadsverkiezingen 2026" }),
    ).not.toBeInTheDocument();

    expect(screen.queryByText("Heemdamseburg")).toBeVisible();
    expect(screen.queryByText("Gemeenteraadsverkiezingen 2026")).toBeVisible();
  });

  test.each([
    { pathname: "/elections/1/data-entry/1/1", hash: "" },
    { pathname: "/elections/1/data-entry/1/1/recounted", hash: "" },
    { pathname: "/elections/1/data-entry/1/1/voters-and-votes", hash: "" },
    { pathname: "/elections/1/data-entry/1/1/list/1", hash: "" },
    { pathname: "/elections/1/data-entry/1/1/save", hash: "" },
  ])("elections link and current election link for $pathname", async (location) => {
    await renderNavBar(location);

    expect(screen.queryByRole("link", { name: "Verkiezingen" })).toBeVisible();
    expect(screen.queryByRole("link", { name: "Heemdamseburg — Gemeenteraadsverkiezingen 2026" })).toBeVisible();
  });

  test.each([
    { pathname: "/elections", hash: "#administratorcoordinator" },
    { pathname: "/users", hash: "#administratorcoordinator" },
    { pathname: "/users/create", hash: "#administratorcoordinator" },
    { pathname: "/users/create/details", hash: "#administratorcoordinator" },
    { pathname: "/workstations", hash: "#administratorcoordinator" },
    { pathname: "/logs", hash: "#administratorcoordinator" },
    { pathname: "/elections/1", hash: "#administratorcoordinator" },
  ])("top level management links for $pathname", async (location) => {
    await renderNavBar(location);

    expect(screen.queryByRole("link", { name: "Verkiezingen" })).toBeVisible();
    expect(screen.queryByRole("link", { name: "Gebruikers" })).toBeVisible();
    expect(screen.queryByRole("link", { name: "Werkplekken" })).toBeVisible();
    expect(screen.queryByRole("link", { name: "Logs" })).toBeVisible();
  });

  test.each([
    { pathname: "/elections/1/report", hash: "#administratorcoordinator" },
    { pathname: "/elections/1/status", hash: "#administratorcoordinator" },
    { pathname: "/elections/1/polling-stations", hash: "#administratorcoordinator" },
    { pathname: "/elections/1/apportionment", hash: "#administratorcoordinator" },
  ])("election management links for $pathname", async (location) => {
    await renderNavBar(location);

    expect(screen.queryByRole("link", { name: "Verkiezingen" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Heemdamseburg — Gemeenteraadsverkiezingen 2026" })).toBeVisible();
  });

  test.each([
    { pathname: "/elections/1/polling-stations/create", hash: "#administratorcoordinator" },
    { pathname: "/elections/1/polling-stations/1/update", hash: "#administratorcoordinator" },
  ])("polling station management links for $pathname", async (location) => {
    await renderNavBar(location);

    expect(screen.queryByRole("link", { name: "Verkiezingen" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Heemdamseburg — Gemeenteraadsverkiezingen 2026" })).toBeVisible();
    expect(screen.queryByRole("link", { name: "Stembureaus" })).toBeVisible();
  });

  test.each([
    { pathname: "/elections/1/apportionment/details-whole-seats", hash: "#administratorcoordinator" },
    { pathname: "/elections/1/apportionment/details-residual-seats", hash: "#administratorcoordinator" },
  ])("polling station management links for $pathname", async (location) => {
    await renderNavBar(location);

    expect(screen.queryByRole("link", { name: "Verkiezingen" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Heemdamseburg — Gemeenteraadsverkiezingen 2026" })).toBeVisible();
    expect(screen.queryByRole("link", { name: "Zetelverdeling" })).toBeVisible();
  });

  test.each([
    { pathname: "/elections/1/report", hash: "#administratorcoordinator" },
    { pathname: "/elections/1/status", hash: "#administratorcoordinator" },
    { pathname: "/elections/1/polling-stations", hash: "#administratorcoordinator" },
    { pathname: "/elections/1/polling-stations/create", hash: "#administratorcoordinator" },
    { pathname: "/elections/1/polling-stations/1/update", hash: "#administratorcoordinator" },
    { pathname: "/elections/1/apportionment/details-whole-seats", hash: "#administratorcoordinator" },
    { pathname: "/elections/1/apportionment/details-residual-seats", hash: "#administratorcoordinator" },
  ])("menu works for $pathname", async (location) => {
    const user = userEvent.setup();
    await renderNavBar(location);

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
