import { RouteObject } from "react-router";

import { PollingStationCreatePage } from "./components/PollingStationCreatePage";
import { PollingStationListPage } from "./components/PollingStationListPage";
import { PollingStationsLayout } from "./components/PollingStationsLayout";
import { PollingStationUpdatePage } from "./components/PollingStationUpdatePage";

export const pollingStationsRoutes: RouteObject[] = [
  {
    Component: PollingStationsLayout,
    children: [
      { index: true, Component: PollingStationListPage },
      { path: "create", Component: PollingStationCreatePage },
      {
        path: ":pollingStationId/update",
        Component: PollingStationUpdatePage,
      },
    ],
  },
];
