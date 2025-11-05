import { RouteObject } from "react-router";

import { DetailIndexPage } from "./components/DetailIndexPage.tsx";
import { DetailLayout } from "./components/DetailLayout.tsx";
import { DetailSectionPage } from "./components/DetailSectionPage.tsx";

export const detailRoutes: RouteObject[] = [
  {
    Component: DetailLayout,
    children: [
      { index: true, Component: DetailIndexPage, handle: { roles: ["coordinator"] } },
      { path: ":sectionId", Component: DetailSectionPage, handle: { roles: ["coordinator"] } },
    ],
  },
];
