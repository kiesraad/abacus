import type { RouteObject } from "react-router";

import { ResolveDifferencesPage } from "./components/ResolveDifferencesPage";

export const resolveDifferencesRoutes: RouteObject[] = [
  { index: true, Component: ResolveDifferencesPage, handle: { roles: ["coordinator_csb", "coordinator_gsb"] } },
];
