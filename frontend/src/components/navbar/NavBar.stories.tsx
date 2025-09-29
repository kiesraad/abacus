import * as React from "react";

import type { Meta, StoryFn } from "@storybook/react-vite";

import { TestUserProvider } from "@/testing/TestUserProvider";
import { Role } from "@/types/generated/openapi";

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
  { pathname: "/account/login", userRole: "typist" },
  { pathname: "/account/setup", userRole: "typist" },
  { pathname: "/elections", userRole: "typist" },
  { pathname: "/elections/1", userRole: "typist" },
  { pathname: "/elections/1/data-entry", userRole: "typist" },
  { pathname: "/elections/1/data-entry/1/1", userRole: "typist" },
  { pathname: "/elections/1/data-entry/1/1/voters_votes_counts", userRole: "typist" },
  { pathname: "/elections/1/data-entry/1/1/differences_counts", userRole: "typist" },
  { pathname: "/elections/1/data-entry/1/1/political_group_votes_1", userRole: "typist" },
  { pathname: "/elections/1/data-entry/1/1/political_group_votes_2", userRole: "typist" },
  { pathname: "/elections/1/data-entry/1/1/save", userRole: "typist" },
  { pathname: "/dev", userRole: "typist" },
  { pathname: "/elections", userRole: "coordinator" },
  { pathname: "/users", userRole: "coordinator" },
  { pathname: "/logs", userRole: "coordinator" },
  { pathname: "/elections/1", userRole: "coordinator" },
  { pathname: "/elections/1/report", userRole: "coordinator" },
  { pathname: "/elections/1/status", userRole: "coordinator" },
  { pathname: "/elections/1/status/1/resolve-differences", userRole: "coordinator" },
  { pathname: "/elections/1/polling-stations", userRole: "coordinator" },
  { pathname: "/elections/1/polling-stations/create", userRole: "coordinator" },
  { pathname: "/elections/1/polling-stations/1/update", userRole: "coordinator" },
];

export const AllRoutes: StoryFn = () => (
  <>
    {locations.map((location) => (
      <React.Fragment key={location.pathname + location.userRole}>
        <TestUserProvider userRole={location.userRole}>
          <code>
            {location.pathname} ({location.userRole})
          </code>
          <NavBar />
          <br />
        </TestUserProvider>
      </React.Fragment>
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
