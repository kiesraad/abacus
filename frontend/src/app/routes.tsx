import { Navigate, RouteObject } from "react-router";

import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import { NotFoundPage } from "@/components/error/NotFoundPage";
import { AdministratorLayout } from "@/components/layout/AdministratorLayout";
import { ElectionLayout } from "@/components/layout/ElectionLayout";
import { ElectionStatusLayout } from "@/components/layout/ElectionStatusLayout";
import { accountRoutes } from "@/features/account/routes";
import { dataEntryRoutes } from "@/features/data_entry/routes";
import { dataEntryHomeRoutes } from "@/features/data_entry_home/routes";
import { devRoutes } from "@/features/dev/routes";
import { electionCreateRoutes } from "@/features/election_create/routes";
import { electionManagementRoutes } from "@/features/election_management/routes";
import { OverviewLayout } from "@/features/election_overview/components/OverviewLayout";
import { OverviewPage } from "@/features/election_overview/components/OverviewPage";
import { electionStatusRoutes } from "@/features/election_status/routes";
import { investigationRoutes } from "@/features/investigations/routes";
import { logsRoutes } from "@/features/logs/routes";
import { pollingStationsRoutes } from "@/features/polling_stations/routes";
import { resolveDifferencesRoutes } from "@/features/resolve_differences/routes";
import { resolveErrorsRoutes } from "@/features/resolve_errors/routes";
import { usersRoutes } from "@/features/users/routes";

import { RootLayout } from "./RootLayout";

const showDevPage = __SHOW_DEV_PAGE__;

export const routes: RouteObject[] = [
  {
    Component: RootLayout,
    errorElement: <ErrorBoundary />,
    children: [
      {
        index: true,
        path: "/",
        element: showDevPage ? <Navigate to="/dev" replace /> : <Navigate to="/account/login" replace />,
        handle: { public: true },
      },
      { path: "account", children: accountRoutes },
      {
        path: "elections",
        Component: OverviewLayout,
        children: [
          { index: true, Component: OverviewPage, handle: { roles: ["administrator", "coordinator", "typist"] } },
          { path: "create", children: electionCreateRoutes },
          {
            path: ":electionId",
            Component: ElectionLayout,
            children: [
              ...electionManagementRoutes,
              { path: "polling-stations", children: pollingStationsRoutes },
              {
                path: "data-entry",
                children: [
                  // index
                  ...dataEntryHomeRoutes,
                  {
                    path: ":pollingStationId/:entryNumber",
                    children: dataEntryRoutes,
                  },
                ],
              },
              {
                path: "status",
                Component: ElectionStatusLayout,
                children: [
                  // index
                  ...electionStatusRoutes,
                  {
                    path: ":pollingStationId/resolve-differences",
                    children: resolveDifferencesRoutes,
                  },
                  {
                    path: ":pollingStationId/resolve-errors",
                    children: resolveErrorsRoutes,
                  },
                ],
              },
              {
                path: "investigations",
                children: investigationRoutes,
              },
            ],
          },
        ],
      },
      {
        Component: AdministratorLayout,
        children: [
          { path: "logs", children: logsRoutes },
          { path: "users", children: usersRoutes },
          ...(showDevPage ? [{ path: "dev", children: devRoutes }] : []),
        ],
      },
    ],
  },
  {
    path: "*",
    element: (
      <NotFoundPage message="error.not_found" path={typeof window !== "undefined" ? window.location.pathname : "/"} />
    ),
    handle: { public: true },
  },
];
