import type { RouteObject } from "react-router";

import { BackupsPage } from "./components/BackupsPage.tsx";

export const backupsRoutes: RouteObject[] = [
  { index: true, Component: BackupsPage, handle: { roles: ["administrator", "coordinator_csb", "coordinator_gsb"] } },
];
