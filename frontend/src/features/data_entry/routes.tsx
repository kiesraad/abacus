import { RouteObject } from "react-router";

import { CheckAndSavePage } from "./components/check_and_save/CheckAndSavePage";
import { DataEntryLayout } from "./components/DataEntryLayout";
import { DataEntrySectionWrapper } from "./components/DataEntrySectionWrapper";

export const dataEntryRoutes: RouteObject[] = [
  {
    Component: DataEntryLayout,
    children: [
      { index: true, Component: null },
      { path: "save", Component: CheckAndSavePage },
      { path: ":sectionId", Component: DataEntrySectionWrapper },
    ],
  },
];
