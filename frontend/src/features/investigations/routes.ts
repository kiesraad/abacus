import { RouteObject } from "react-router";

import { AddInvestigation } from "./components/AddInvestigation";
import { AddInvestigationLayout } from "./components/AddInvestigationLayout";
import { InvestigationFindings } from "./components/InvestigationFindings";
import { InvestigationPrintCorrigendum } from "./components/InvestigationPrintCorrigendum";
import { InvestigationReason } from "./components/InvestigationReason";
import { InvestigationsOverview } from "./components/InvestigationsOverview";

export const investigationRoutes: RouteObject[] = [
  { index: true, Component: InvestigationsOverview },
  {
    path: "add",
    children: [
      {
        index: true,
        Component: AddInvestigation,
      },
      {
        path: ":pollingStationId",
        Component: AddInvestigationLayout,
        children: [
          {
            index: true,
            path: "reason",
            Component: InvestigationReason,
          },
          {
            path: "print-corrigendum",
            Component: InvestigationPrintCorrigendum,
          },
          {
            path: "findings",
            Component: InvestigationFindings,
          },
        ],
      },
    ],
  },
];
