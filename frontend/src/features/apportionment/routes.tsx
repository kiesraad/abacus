import type { RouteObject } from "react-router";

import { ApportionmentLayout } from "./components/ApportionmentLayout";
import { ApportionmentPage } from "./components/ApportionmentPage";
import { ApportionmentFullSeatsPage } from "./components/full_seats/ApportionmentFullSeatsPage";
import { ApportionmentListDetailsPage } from "./components/list_details/ApportionmentListDetailsPage";
import { ApportionmentResidualSeatsPage } from "./components/residual_seats/ApportionmentResidualSeatsPage";

export const apportionmentRoutes: RouteObject[] = [
  {
    Component: ApportionmentLayout,
    children: [
      { index: true, Component: ApportionmentPage, handle: { roles: ["coordinator"] } },
      {
        path: ":pgNumber",
        Component: ApportionmentListDetailsPage,
        handle: { roles: ["coordinator"] },
      },
      {
        path: "details-residual-seats",
        Component: ApportionmentResidualSeatsPage,
        handle: { roles: ["coordinator"] },
      },
      {
        path: "details-full-seats",
        Component: ApportionmentFullSeatsPage,
        handle: { roles: ["coordinator"] },
      },
    ],
  },
];
