import { RouteObject } from "react-router";

import { ApportionmentLayout } from "./components/ApportionmentLayout";
import { ApportionmentPage } from "./components/ApportionmentPage";
import { ApportionmentFullSeatsPage } from "./components/full_seats/ApportionmentFullSeatsPage";
import { ApportionmentListDetailsPage } from "./components/list_details/ApportionmentListDetailsPage";
import { ApportionmentResidualSeatsPage } from "./components/residual_seats/ApportionmentResidualSeatsPage";

export const apportionmentRoutes: RouteObject[] = [
  {
    Component: ApportionmentLayout,
    children: [
      { index: true, Component: ApportionmentPage },
      {
        path: ":pgNumber",
        Component: ApportionmentListDetailsPage,
      },
      {
        path: "details-residual-seats",
        Component: ApportionmentResidualSeatsPage,
      },
      {
        path: "details-full-seats",
        Component: ApportionmentFullSeatsPage,
      },
    ],
  },
];
