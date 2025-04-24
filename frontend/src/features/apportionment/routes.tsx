import { RouteObject } from "react-router";

import { ApportionmentLayout } from "./components/ApportionmentLayout";
import { ApportionmentPage } from "./components/ApportionmentPage";
import { ApportionmentFullSeatsPage } from "./components/full_seats/ApportionmentFullSeatsPage";
import { ApportionmentListDetailsPage } from "./components/list_details/ApportionmentListDetailsPage";
import { ApportionmentResidualSeatsPage } from "./components/residual_seats/ApportionmentResidualSeatsPage";

export const apportionmentRoutes: RouteObject[] = [
  {
    element: <ApportionmentLayout />,
    children: [
      { index: true, element: <ApportionmentPage /> },
      {
        path: ":pgNumber",
        element: <ApportionmentListDetailsPage />,
      },
      {
        path: "details-residual-seats",
        element: <ApportionmentResidualSeatsPage />,
      },
      {
        path: "details-full-seats",
        element: <ApportionmentFullSeatsPage />,
      },
    ],
  },
];
