import { RouteObject } from "react-router";

import { ElectionStatusPage } from "./components/ElectionStatusPage";

export const electionStatusRoutes: RouteObject[] = [{ path: "status", element: <ElectionStatusPage /> }];
