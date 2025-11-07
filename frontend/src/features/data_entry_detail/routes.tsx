import { RouteObject } from "react-router";

import { DetailIndexPage } from "./components/DetailIndexPage";
import { DetailLayout } from "./components/DetailLayout";
import { DetailSectionPage } from "./components/DetailSectionPage";

export const detailRoutes: RouteObject[] = [
  {
    Component: DetailLayout,
    children: [
      { index: true, Component: DetailIndexPage, handle: { roles: ["coordinator"] } },
      { path: ":sectionId", Component: DetailSectionPage, handle: { roles: ["coordinator"] } },
    ],
  },
];
