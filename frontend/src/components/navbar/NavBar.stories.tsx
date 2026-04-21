import type { Meta, StoryObj } from "@storybook/react-vite";
import { Fragment } from "react";
import { expect, userEvent } from "storybook/test";
import { TestUserProvider } from "@/testing/TestUserProvider";
import type { Role } from "@/types/generated/openapi";
import { NavBar } from "./NavBar";
import cls from "./NavBar.module.css";
import { NavBarMenuButton } from "./NavBarMenu";

const meta = {
  parameters: {
    needsElection: true,
  },
} satisfies Meta;
export default meta;

type Story = StoryObj<typeof meta>;

type Locations = { pathname: string; userRole: Role }[];

const locationsWithoutNavBarLinks: Locations = [
  { pathname: "/account/login", userRole: "typist_gsb" },
  { pathname: "/account/setup", userRole: "typist_gsb" },
  { pathname: "/elections", userRole: "typist_gsb" },
  { pathname: "/elections/1", userRole: "typist_gsb" },
  { pathname: "/dev", userRole: "typist_gsb" },
];

function renderNavBar(locations: Locations) {
  return () => (
    <>
      {locations.map((location) => (
        <Fragment key={location.pathname + location.userRole}>
          <TestUserProvider userRole={location.userRole}>
            <code>
              {location.pathname} ({location.userRole})
            </code>
            <NavBar location={location} />
            <br />
          </TestUserProvider>
        </Fragment>
      ))}
    </>
  );
}

export const NavBarWithoutLinks: Story = {
  render: renderNavBar(locationsWithoutNavBarLinks),
  play: async ({ canvas }) => {
    const numberOfLocations = locationsWithoutNavBarLinks.length;
    const totalNumberOfLinks = canvas.getAllByRole("link").length;
    const numberOfLogoutLinks = canvas.getAllByRole("link", { name: "Afmelden" }).length;

    await expect(numberOfLogoutLinks, "number of links to 'Afmelden' does not match number of locations").toEqual(
      numberOfLocations,
    );
    await expect(totalNumberOfLinks, "number of links to 'Afmelden' does not match total number of links").toEqual(
      numberOfLogoutLinks,
    );
  },
};

const locationsWithAdminLinks: Locations = [
  { pathname: "/elections", userRole: "coordinator_gsb" },
  { pathname: "/users", userRole: "coordinator_gsb" },
  { pathname: "/logs", userRole: "coordinator_gsb" },
  { pathname: "/elections/1", userRole: "coordinator_gsb" },
];

export const NavBarWithAdminLinks: Story = {
  render: renderNavBar(locationsWithAdminLinks),
  play: async ({ canvas }) => {
    const numberOfLocations = locationsWithAdminLinks.length;
    const totalNumberOfLinks = canvas.getAllByRole("link").length;

    const numberOfVerkiezingenLinks = canvas.getAllByRole("link", { name: "Verkiezingen" }).length;
    const numberOfGebruikersLinks = canvas.getAllByRole("link", { name: "Gebruikers" }).length;
    const numberOfLogsLinks = canvas.getAllByRole("link", { name: "Logs" }).length;
    const numberOfLogoutLinks = canvas.getAllByRole("link", { name: "Afmelden" }).length;

    await expect(numberOfVerkiezingenLinks, "number of links to 'Verkiezingen' does not match").toEqual(
      numberOfLocations,
    );
    await expect(numberOfGebruikersLinks, "number of links to 'Gebruikers' does not match").toEqual(numberOfLocations);
    await expect(numberOfLogsLinks, "number of links to 'Logs' does not match").toEqual(numberOfLocations);
    await expect(numberOfLogoutLinks, "number of links to 'Afmelden' does not match").toEqual(numberOfLocations);
    await expect(totalNumberOfLinks, "sum of number of links does not match total number of links").toEqual(
      numberOfVerkiezingenLinks + numberOfGebruikersLinks + numberOfLogsLinks + numberOfLogoutLinks,
    );
  },
};

const locationsWithElectionsLinksTypist: Locations = [
  { pathname: "/elections/1/data-entry", userRole: "typist_gsb" },
  { pathname: "/elections/1/data-entry/1/1", userRole: "typist_gsb" },
  { pathname: "/elections/1/data-entry/1/1/voters_votes_counts", userRole: "typist_gsb" },
  { pathname: "/elections/1/data-entry/1/1/differences_counts", userRole: "typist_gsb" },
  { pathname: "/elections/1/data-entry/1/1/political_group_votes_1", userRole: "typist_gsb" },
  { pathname: "/elections/1/data-entry/1/1/political_group_votes_2", userRole: "typist_gsb" },
  { pathname: "/elections/1/data-entry/1/1/save", userRole: "typist_gsb" },
];

export const ElectionsNavBarForTypist: Story = {
  render: renderNavBar(locationsWithElectionsLinksTypist),
  play: async ({ canvas }) => {
    const numberOfLocations = locationsWithElectionsLinksTypist.length;
    const numberOfElectionLinks = canvas.getAllByRole("link", { name: "Verkiezingen" }).length;
    const numberOfCommitteeSessionLinks = canvas.getAllByRole("link", { name: /GSB 0035 Heemdamseburg/ }).length;
    const numberOfLogoutLinks = canvas.getAllByRole("link", { name: "Afmelden" }).length;
    const totalNumberOfLinks = canvas.getAllByRole("link").length;

    await expect(numberOfElectionLinks, "number of links to 'Verkiezingen' does not match").toEqual(numberOfLocations);
    // /elections/1/data-entry does not have a link to committee session, hence the -1
    await expect(numberOfCommitteeSessionLinks, "number of links to 'GSB 0035 Heemdamseburg' does not match").toEqual(
      numberOfLocations - 1,
    );
    await expect(numberOfLogoutLinks, "number of links to 'Afmelden' does not match").toEqual(numberOfLocations);

    await expect(totalNumberOfLinks, "sum of number of links does not match total number of links").toEqual(
      numberOfLogoutLinks + numberOfElectionLinks + numberOfCommitteeSessionLinks,
    );
  },
};

const locationsWithElectionsLinksCoordinator: Locations = [
  { pathname: "/elections/1/report", userRole: "coordinator_gsb" },
  { pathname: "/elections/1/status", userRole: "coordinator_gsb" },
  { pathname: "/elections/1/status/1/resolve-differences", userRole: "coordinator_gsb" },
  { pathname: "/elections/1/polling-stations", userRole: "coordinator_gsb" },
  { pathname: "/elections/1/polling-stations/create", userRole: "coordinator_gsb" },
  { pathname: "/elections/1/polling-stations/1/update", userRole: "coordinator_gsb" },
  { pathname: "/elections/1/apportionment", userRole: "coordinator_csb" },
  { pathname: "/elections/1/apportionment/details-full-seats", userRole: "coordinator_csb" },
  { pathname: "/elections/1/apportionment/details-residual-seats", userRole: "coordinator_csb" },
];

export const ElectionsNavBarForCoordinator: Story = {
  render: renderNavBar(locationsWithElectionsLinksCoordinator),
  play: async ({ canvas }) => {
    const numberOfLocations = locationsWithElectionsLinksCoordinator.length;
    const numberOfMenuButtons = canvas.getAllByRole("button", { name: "Menu" }).length;
    const numberOfCommitteeSessionLinks = canvas.getAllByRole("link", { name: /GSB 0035 Heemdamseburg/ }).length;
    const numberOfLogoutLinks = canvas.getAllByRole("link", { name: "Afmelden" }).length;

    await expect(numberOfMenuButtons).toBe(numberOfLocations);
    await expect(numberOfCommitteeSessionLinks, "number of links to 'GSB 0035 Heemdamseburg' does not match").toEqual(
      numberOfLocations,
    );
    await expect(numberOfLogoutLinks, "number of links to 'Afmelden' does not match").toEqual(numberOfLocations);
    // Not checking sum of number of links with total number of links,
    // because some locations have additional links in their breadcrumb.
  },
};

export const MenuButtonWithMenu: Story = {
  render: () => (
    <nav aria-label="primary-navigation" className={cls.navBar}>
      <div className={cls.links}>
        <NavBarMenuButton />
      </div>
    </nav>
  ),
  play: async ({ canvas }) => {
    const user = userEvent.setup();
    const menuButton = canvas.getByRole("button");
    await expect(menuButton).toBeVisible();
    await user.click(menuButton);

    await expect(await canvas.findByRole("link", { name: "Verkiezingen" })).toBeVisible();
    await expect(await canvas.findByRole("link", { name: "Gebruikers" })).toBeVisible();
    await expect(await canvas.findByRole("link", { name: "Logs" })).toBeVisible();

    await user.click(await canvas.findByLabelText("primary-navigation"));
    await expect(canvas.queryByRole("link", { name: "Verkiezingen" })).not.toBeInTheDocument();
  },
};
