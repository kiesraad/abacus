import { RouteObject } from "react-router";

import { ResolveErrorsIndexPage } from "./components/ResolveErrorsIndexPage";
import { ResolveErrorsLayout } from "./components/ResolveErrorsLayout";
import { ResolveErrorsSectionPage } from "./components/ResolveErrorsSectionPage";

export const resolveErrorsRoutes: RouteObject[] = [
  {
    Component: ResolveErrorsLayout,
    children: [
      { index: true, Component: ResolveErrorsIndexPage, handle: { roles: ["coordinator"] } },
      { path: ":sectionId", Component: ResolveErrorsSectionPage, handle: { roles: ["coordinator"] } },
    ],
  },
];
