import { RouteObject } from "react-router";

import { ResolveDifferencesPage } from "./components/ResolveDifferencesPage";

export const resolveDifferencesRoutes: RouteObject[] = [
  { path: ":pollingStationId/resolve-differences", element: <ResolveDifferencesPage /> },
];
