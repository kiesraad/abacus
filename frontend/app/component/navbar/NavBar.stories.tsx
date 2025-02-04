import * as React from "react";

import { Story } from "@ladle/react";
import { electionDetailsMockResponse } from "lib/api-mocks/ElectionMockData";
import { ElectionProviderContext } from "lib/api/election/ElectionProviderContext";

import { Election } from "@kiesraad/api";

import { NavBar } from "./NavBar";

export default {
  title: "App / Navigation bar",
};

const locations = [
  { pathname: "/account/login", hash: "" },
  { pathname: "/account/setup", hash: "" },
  { pathname: "/elections", hash: "" },
  { pathname: "/elections/1", hash: "" },
  { pathname: "/elections/1/data-entry", hash: "" },
  { pathname: "/elections/1/data-entry/1/1", hash: "" },
  { pathname: "/elections/1/data-entry/1/1/recounted", hash: "" },
  { pathname: "/elections/1/data-entry/1/1/voters-and-votes", hash: "" },
  { pathname: "/elections/1/data-entry/1/1/list/1", hash: "" },
  { pathname: "/elections/1/data-entry/1/1/save", hash: "" },
  { pathname: "/dev", hash: "" },
  { pathname: "/elections", hash: "#administratorcoordinator" },
  { pathname: "/users", hash: "#administratorcoordinator" },
  { pathname: "/workstations", hash: "#administrator" },
  { pathname: "/logs", hash: "#administratorcoordinator" },
  { pathname: "/elections/1", hash: "#administratorcoordinator" },
  { pathname: "/elections/1/report", hash: "#administratorcoordinator" },
  { pathname: "/elections/1/status", hash: "#administratorcoordinator" },
  { pathname: "/elections/1/polling-stations", hash: "#administratorcoordinator" },
  { pathname: "/elections/1/polling-stations/create", hash: "#administratorcoordinator" },
  { pathname: "/elections/1/polling-stations/1/update", hash: "#administratorcoordinator" },
];

export const AllRoutes: Story = () => (
  <ElectionProviderContext.Provider
    value={{
      election: electionDetailsMockResponse.election as Required<Election>,
      pollingStations: electionDetailsMockResponse.polling_stations,
    }}
  >
    {locations.map((location) => (
      <React.Fragment key={location.pathname + location.hash}>
        <code>
          {location.pathname}
          {location.hash}
        </code>
        <NavBar location={location} />
        <br />
      </React.Fragment>
    ))}
  </ElectionProviderContext.Provider>
);
