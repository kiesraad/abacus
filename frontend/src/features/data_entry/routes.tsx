import type { RouteObject } from "react-router";

import { DataEntryPage } from "./components/DataEntryPage";

export const dataEntryRoutes: RouteObject[] = [
  {
    path: ":sectionId?",
    Component: DataEntryPage,
    handle: { roles: ["typist"] },
  },
];
