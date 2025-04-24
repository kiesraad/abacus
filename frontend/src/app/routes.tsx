import { Navigate, RouteObject } from "react-router";

import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import { AdministratorLayout } from "@/components/layout/AdministratorLayout";
import { ElectionLayout } from "@/components/layout/ElectionLayout";
import { RootLayout } from "@/components/layout/RootLayout";
import { NotFoundPage } from "@/components/page/NotFoundPage";
import { accountRoutes } from "@/features/account/routes";
import { apportionmentRoutes } from "@/features/apportionment/routes";
import { dataEntryRoutes } from "@/features/data_entry/routes";
import { dataEntryChoiceRoutes } from "@/features/data_entry_choice/routes";
import { devRoutes } from "@/features/dev/routes";
import { ElectionCreatePage } from "@/features/election_management/components";
import { ElectionHomePage } from "@/features/election_management/components/ElectionHomePage";
import { electionManagementRoutes } from "@/features/election_management/routes";
import { OverviewLayout } from "@/features/election_overview/components/OverviewLayout";
import { OverviewPage } from "@/features/election_overview/components/OverviewPage";
import { electionStatusRoutes } from "@/features/election_status/routes";
import { logsRoutes } from "@/features/logs/routes";
import { pollingStationsRoutes } from "@/features/polling_stations/routes";
import { resolveDifferencesRoutes } from "@/features/resolve_differences/routes";
import { usersRoutes } from "@/features/users/routes";
import { workstationsRoutes } from "@/features/workstations/routes";

//TODO check if we should use Component instead of element, Component is preferred since it does not render it right away.

export const routes: RouteObject[] = [
  {
    element: <RootLayout />,
    errorElement: <ErrorBoundary />,
    children: [
      { index: true, path: "/", element: <Navigate to="/dev" replace /> },
      {
        path: "*",
        element: <NotFoundPage message="error.not_found" path={window.location.pathname} />,
      },
      { path: "account", children: accountRoutes },
      {
        path: "elections",
        element: <OverviewLayout />,
        children: [
          { index: true, element: <OverviewPage /> },
          { path: "create", element: <ElectionCreatePage /> },
          {
            path: ":electionId",
            element: <ElectionLayout />,
            children: [
              { index: true, element: <ElectionHomePage /> },
              {
                path: "apportionment",
                children: apportionmentRoutes,
              },

              { path: "report", children: electionManagementRoutes },
              { path: "polling-stations", children: pollingStationsRoutes },
              {
                path: "data-entry",
                children: [
                  // index
                  ...dataEntryChoiceRoutes,
                  {
                    path: ":pollingStationId/:entryNumber",
                    children: dataEntryRoutes,
                  },
                ],
              },

              {
                path: "status",
                children: [
                  // index
                  ...electionStatusRoutes,
                  {
                    path: ":pollingStationId/resolve-differences",
                    children: resolveDifferencesRoutes,
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        element: <AdministratorLayout />,
        children: [
          { path: "dev", children: devRoutes },
          { path: "logs", children: logsRoutes },
          { path: "users", children: usersRoutes },
          { path: "workstations", children: workstationsRoutes },
        ],
      },
    ],
  },
];
