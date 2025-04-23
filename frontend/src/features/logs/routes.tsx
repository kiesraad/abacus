import { RouteObject } from "react-router";

import { LogsHomePage } from "./components/LogsHomePage";

export const logsRoutes: RouteObject[] = [{ path: "logs", element: <LogsHomePage /> }];
