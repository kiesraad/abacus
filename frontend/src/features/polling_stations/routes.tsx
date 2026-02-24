import type { RouteObject } from "react-router";

import { PollingStationCreatePage } from "./components/PollingStationCreatePage";
import { PollingStationImportPage } from "./components/PollingStationImportPage";
import { PollingStationListPage } from "./components/PollingStationListPage";
import { PollingStationsLayout } from "./components/PollingStationsLayout";
import { PollingStationUpdatePage } from "./components/PollingStationUpdatePage";

export const pollingStationsRoutes: RouteObject[] = [
  {
    Component: PollingStationsLayout,
    children: [
      { index: true, Component: PollingStationListPage, handle: { roles: ["administrator", "coordinator_gsb"] } },
      { path: "create", Component: PollingStationCreatePage, handle: { roles: ["administrator", "coordinator_gsb"] } },
      { path: "import", Component: PollingStationImportPage, handle: { roles: ["administrator", "coordinator_gsb"] } },
      {
        path: ":pollingStationId/update",
        Component: PollingStationUpdatePage,
        handle: { roles: ["administrator", "coordinator_gsb"] },
      },
    ],
  },
];
