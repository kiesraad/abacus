import { RouteObject } from "react-router";

import { AddInvestigantion } from "./components/AddInvestigantion";
import { AddInvestigantionLayout } from "./components/AddInvestigantionLayout";
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
        Component: AddInvestigantion,
      },
      {
        path: ":pollingStationId",
        Component: AddInvestigantionLayout,
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
        ],
      },
    ],
  },
];
