import type { RouteObject } from "react-router";

import { AddInvestigationLayout } from "./components/AddInvestigationLayout";
import { AddInvestigationPage } from "./components/AddInvestigationPage";
import { InvestigationFindingsPage } from "./components/InvestigationFindingsPage";
import { InvestigationPrintCorrigendumPage } from "./components/InvestigationPrintCorrigendumPage";
import { InvestigationReasonPage } from "./components/InvestigationReasonPage";
import { InvestigationsLayout } from "./components/InvestigationsLayout";
import { InvestigationsOverviewPage } from "./components/InvestigationsOverviewPage";

export const investigationRoutes: RouteObject[] = [
  {
    Component: InvestigationsLayout,
    children: [
      { index: true, Component: InvestigationsOverviewPage, handle: { roles: ["administrator", "coordinator_gsb"] } },
      {
        index: true,
        path: "add",
        Component: AddInvestigationPage,
        handle: { roles: ["coordinator_gsb"] },
      },
      {
        path: ":pollingStationId",
        Component: AddInvestigationLayout,
        children: [
          {
            index: true,
            path: "reason",
            Component: InvestigationReasonPage,
            handle: { roles: ["coordinator_gsb"] },
          },
          {
            path: "print-corrigendum",
            Component: InvestigationPrintCorrigendumPage,
            handle: { roles: ["coordinator_gsb"] },
          },
          {
            path: "findings",
            Component: InvestigationFindingsPage,
            handle: { roles: ["coordinator_gsb"] },
          },
        ],
      },
    ],
  },
];
