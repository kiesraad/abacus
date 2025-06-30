import { RouteObject } from "react-router";

import { ResolveErrorsIndexPage } from "./components/ResolveErrorsIndexPage";
import { ResolveErrorsLayout } from "./components/ResolveErrorsLayout";

export const resolveErrorsRoutes: RouteObject[] = [
  {
    Component: ResolveErrorsLayout,
    children: [{ index: true, Component: ResolveErrorsIndexPage }],
  },
];
