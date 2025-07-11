import { RouteObject } from "react-router";

import { ResolveErrorsIndexPage } from "./components/ResolveErrorsIndexPage";
import { ResolveErrorsLayout } from "./components/ResolveErrorsLayout";
import { ResolveErrorsSectionPage } from "./components/ResolveErrorsSectionPage";

export const resolveErrorsRoutes: RouteObject[] = [
  {
    Component: ResolveErrorsLayout,
    children: [
      { index: true, Component: ResolveErrorsIndexPage },
      { path: ":sectionId", Component: ResolveErrorsSectionPage },
    ],
  },
];
