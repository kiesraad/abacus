import type { RouteObject } from "react-router";

import { ApportionmentLayout } from "./components/ApportionmentLayout";
import { ApportionmentPage } from "./components/ApportionmentPage";
import { AddDeceasedCandidatePage } from "./components/deceased_candidates/AddDeceasedCandidatePage";
import { DeceasedCandidatesPage } from "./components/deceased_candidates/DeceasedCandidatesPage";
import { IncludeAllCandidatesPage } from "./components/deceased_candidates/IncludeAllCandidatesPage";
import { DrawingLotsPage } from "./components/drawing_lots/DrawingLotsPage";
import { ApportionmentFullSeatsPage } from "./components/full_seats/ApportionmentFullSeatsPage";
import { ApportionmentListDetailsPage } from "./components/list_details/ApportionmentListDetailsPage";
import { ApportionmentResidualSeatsPage } from "./components/residual_seats/ApportionmentResidualSeatsPage";

export const apportionmentRoutes: RouteObject[] = [
  {
    Component: ApportionmentLayout,
    children: [
      { index: true, Component: ApportionmentPage, handle: { roles: ["coordinator_csb"] } },
      {
        path: ":listNumber",
        Component: ApportionmentListDetailsPage,
        handle: { roles: ["coordinator_csb"] },
      },
      {
        path: "details-residual-seats",
        Component: ApportionmentResidualSeatsPage,
        handle: { roles: ["coordinator_csb"] },
      },
      {
        path: "details-full-seats",
        Component: ApportionmentFullSeatsPage,
        handle: { roles: ["coordinator_csb"] },
      },
      {
        path: "include-all-candidates",
        Component: IncludeAllCandidatesPage,
        handle: { roles: ["coordinator_csb"] },
      },
      {
        path: "deceased-candidates/add",
        Component: AddDeceasedCandidatePage,
        handle: { roles: ["coordinator_csb"] },
      },
      {
        path: "deceased-candidates",
        Component: DeceasedCandidatesPage,
        handle: { roles: ["coordinator_csb"] },
      },
      {
        path: "drawing-lots",
        Component: DrawingLotsPage,
        handle: { roles: ["coordinator_csb"] },
      },
    ],
  },
];
