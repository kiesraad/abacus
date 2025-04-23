import { RouteObject } from "react-router";

import { DevHomePage } from "./components/DevHomePage";

export const devRoutes: RouteObject[] = [{ path: "dev", element: <DevHomePage /> }];
