import { RouteObject } from "react-router";

import { LogsHomePage } from "./components/LogsHomePage";

export const logsRoutes: RouteObject[] = [
  { index: true, Component: LogsHomePage, handle: { roles: ["administrator", "coordinator"] } },
];
