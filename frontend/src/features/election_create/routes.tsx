import { RouteObject } from "react-router";

import { ElectionCreateLayout } from "./components/ElectionCreateLayout";
import { PollingStationRole } from "./components/PollingStationRole";
import { UploadElectionDefinition } from "./components/UploadElectionDefinition";

export const electionCreateRoutes: RouteObject[] = [
  {
    Component: ElectionCreateLayout,
    children: [
      { index: true, Component: UploadElectionDefinition },
      { path: "polling-station-role", Component: PollingStationRole },
    ],
  },
];
