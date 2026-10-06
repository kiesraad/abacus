import type { RouteObject } from "react-router";

import { DataEntryImportPage } from "./components/DataEntryImportPage";

export const dataEntryImportRoutes: RouteObject[] = [
  { index: true, Component: DataEntryImportPage, handle: { roles: ["administrator", "coordinator_csb"] } },
];
