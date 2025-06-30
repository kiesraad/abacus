import { RouteObject } from "react-router";

import { DataEntryLayout } from "./components/DataEntryLayout";

export const dataEntryRoutes: RouteObject[] = [
  {
    path: ":sectionId?",
    Component: DataEntryLayout,
  },
];
