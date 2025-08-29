import { RouteObject } from "react-router";

import { AddInvestigationLayout } from "./components/AddInvestigationLayout";
import { AddInvestigationPage } from "./components/AddInvestigationPage.tsx";
import { InvestigationFindings } from "./components/InvestigationFindings";
import { InvestigationPrintCorrigendumPage } from "./components/InvestigationPrintCorrigendumPage";
import { InvestigationReason } from "./components/InvestigationReason";
import { InvestigationsLayout } from "./components/InvestigationsLayout";
import { InvestigationsOverviewPage } from "./components/InvestigationsOverviewPage.tsx";

export const investigationRoutes: RouteObject[] = [
  {
    Component: InvestigationsLayout,
    children: [
      { index: true, Component: InvestigationsOverviewPage },
      {
        path: "add",
        children: [
          {
            index: true,
            Component: AddInvestigationPage,
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
                Component: InvestigationPrintCorrigendumPage,
              },
              {
                path: "findings",
                Component: InvestigationFindings,
              },
            ],
          },
        ],
      },
    ],
  },
];
