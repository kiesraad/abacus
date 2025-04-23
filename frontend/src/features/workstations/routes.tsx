import { RouteObject } from "react-router";

import { WorkstationsHomePage } from "./components/WorkstationsHomePage";

export const workstationsRoutes: RouteObject[] = [
  {
    path: "workstations",
    element: <WorkstationsHomePage />,
  },
];
