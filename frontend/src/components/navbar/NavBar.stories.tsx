import * as React from "react";

import { Story } from "@ladle/react";

import { ElectionProviderContext } from "@/api/election/ElectionProviderContext";

import { Election, Role, TestUserProvider } from "@kiesraad/api";
import { electionDetailsMockResponse } from "@kiesraad/api-mocks";

import { NavBar } from "./NavBar";
import cls from "./NavBar.module.css";
import { NavBarMenu, NavBarMenuButton } from "./NavBarMenu";

export default {
  title: "App / Navigation bar",
};

const locations: { pathname: string; userRole: Role }[] = [
  { pathname: "/account/login", userRole: "typist" },
  { pathname: "/account/setup", userRole: "typist" },
  { pathname: "/elections", userRole: "typist" },
  { pathname: "/elections/1", userRole: "typist" },
  { pathname: "/elections/1/data-entry", userRole: "typist" },
  { pathname: "/elections/1/data-entry/1/1", userRole: "typist" },
  { pathname: "/elections/1/data-entry/1/1/recounted", userRole: "typist" },
  { pathname: "/elections/1/data-entry/1/1/voters-and-votes", userRole: "typist" },
  { pathname: "/elections/1/data-entry/1/1/list/1", userRole: "typist" },
  { pathname: "/elections/1/data-entry/1/1/save", userRole: "typist" },
  { pathname: "/dev", userRole: "typist" },
  { pathname: "/elections", userRole: "coordinator" },
  { pathname: "/users", userRole: "coordinator" },
  { pathname: "/workstations", userRole: "coordinator" },
  { pathname: "/logs", userRole: "coordinator" },
  { pathname: "/elections/1", userRole: "coordinator" },
  { pathname: "/elections/1/report", userRole: "coordinator" },
  { pathname: "/elections/1/status", userRole: "coordinator" },
  { pathname: "/elections/1/polling-stations", userRole: "coordinator" },
  { pathname: "/elections/1/polling-stations/create", userRole: "coordinator" },
  { pathname: "/elections/1/polling-stations/1/update", userRole: "coordinator" },
  { pathname: "/elections/1/apportionment", userRole: "coordinator" },
  { pathname: "/elections/1/apportionment/details-full-seats", userRole: "coordinator" },
  { pathname: "/elections/1/apportionment/details-residual-seats", userRole: "coordinator" },
];

export const AllRoutes: Story = () => (
  <ElectionProviderContext.Provider
    value={{
      election: electionDetailsMockResponse.election as Required<Election>,
      pollingStations: electionDetailsMockResponse.polling_stations,
    }}
  >
    {locations.map((location) => (
      <React.Fragment key={location.pathname + location.userRole}>
        <TestUserProvider userRole={location.userRole}>
          <code>
            {location.pathname}
            {location.userRole}
          </code>
          <NavBar location={location} />
          <br />
        </TestUserProvider>
      </React.Fragment>
    ))}
  </ElectionProviderContext.Provider>
);

export const Menu: Story = () => (
  <div className={cls.navBarMenuContainer}>
    <NavBarMenu />
  </div>
);

export const MenuButton: Story = () => (
  <nav aria-label="primary-navigation" className={cls.navBar}>
    <div className={cls.links}>
      <NavBarMenuButton />
    </div>
  </nav>
);
