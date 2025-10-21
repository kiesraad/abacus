import { RouteObject } from "react-router";

import { DevHomePage } from "./components/DevHomePage";

export const devRoutes: RouteObject[] = [{ index: true, Component: DevHomePage, handle: { public: true } }];
