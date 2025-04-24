import { RouteObject } from "react-router";

import { PollingStationCreatePage } from "./components/PollingStationCreatePage";
import { PollingStationListPage } from "./components/PollingStationListPage";
import { PollingStationsLayout } from "./components/PollingStationsLayout";
import { PollingStationUpdatePage } from "./components/PollingStationUpdatePage";

export const pollingStationsRoutes: RouteObject[] = [
  {
    element: <PollingStationsLayout />,
    children: [
      { index: true, element: <PollingStationListPage /> },
      { path: "create", element: <PollingStationCreatePage /> },
      {
        path: ":pollingStationId/update",
        element: <PollingStationUpdatePage />,
      },
    ],
  },
];
