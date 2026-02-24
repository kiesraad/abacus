import type { Meta, StoryFn } from "@storybook/react-vite";
import { Fragment } from "react";

import { TestUserProvider } from "@/testing/TestUserProvider";
import type { Role } from "@/types/generated/openapi";

import { NavBar } from "./NavBar";
import cls from "./NavBar.module.css";
import { NavBarMenu, NavBarMenuButton } from "./NavBarMenu";

const meta = {
  parameters: {
    needsElection: true,
  },
} satisfies Meta;
export default meta;

const locations: { pathname: string; userRole: Role }[] = [
  { pathname: "/account/login", userRole: "typist_gsb" },
  { pathname: "/account/setup", userRole: "typist_gsb" },
  { pathname: "/elections", userRole: "typist_gsb" },
  { pathname: "/elections/1", userRole: "typist_gsb" },
  { pathname: "/elections/1/data-entry", userRole: "typist_gsb" },
  { pathname: "/elections/1/data-entry/1/1", userRole: "typist_gsb" },
  { pathname: "/elections/1/data-entry/1/1/voters_votes_counts", userRole: "typist_gsb" },
  { pathname: "/elections/1/data-entry/1/1/differences_counts", userRole: "typist_gsb" },
  { pathname: "/elections/1/data-entry/1/1/political_group_votes_1", userRole: "typist_gsb" },
  { pathname: "/elections/1/data-entry/1/1/political_group_votes_2", userRole: "typist_gsb" },
  { pathname: "/elections/1/data-entry/1/1/save", userRole: "typist_gsb" },
  { pathname: "/dev", userRole: "typist_gsb" },
  { pathname: "/elections", userRole: "coordinator_gsb" },
  { pathname: "/users", userRole: "coordinator_gsb" },
  { pathname: "/logs", userRole: "coordinator_gsb" },
  { pathname: "/elections/1", userRole: "coordinator_gsb" },
  { pathname: "/elections/1/report", userRole: "coordinator_gsb" },
  { pathname: "/elections/1/status", userRole: "coordinator_gsb" },
  { pathname: "/elections/1/status/1/resolve-differences", userRole: "coordinator_gsb" },
  { pathname: "/elections/1/polling-stations", userRole: "coordinator_gsb" },
  { pathname: "/elections/1/polling-stations/create", userRole: "coordinator_gsb" },
  { pathname: "/elections/1/polling-stations/1/update", userRole: "coordinator_gsb" },
];

export const AllRoutes: StoryFn = () => (
  <>
    {locations.map((location) => (
      <Fragment key={location.pathname + location.userRole}>
        <TestUserProvider userRole={location.userRole}>
          <code>
            {location.pathname} ({location.userRole})
          </code>
          <NavBar />
          <br />
        </TestUserProvider>
      </Fragment>
    ))}
  </>
);

export const Menu: StoryFn = () => (
  <div className={cls.navBarMenuContainer}>
    <NavBarMenu />
  </div>
);

export const MenuButton: StoryFn = () => (
  <nav aria-label="primary-navigation" className={cls.navBar}>
    <div className={cls.links}>
      <NavBarMenuButton />
    </div>
  </nav>
);
