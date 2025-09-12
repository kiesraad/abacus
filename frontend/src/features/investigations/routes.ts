import { RouteObject } from "react-router";

import { AddInvestigationLayout } from "./components/AddInvestigationLayout";
import { AddInvestigationPage } from "./components/AddInvestigationPage.tsx";
import { InvestigationFindingsPage } from "./components/InvestigationFindingsPage.tsx";
import { InvestigationPrintCorrigendumPage } from "./components/InvestigationPrintCorrigendumPage";
import { InvestigationReasonPage } from "./components/InvestigationReasonPage.tsx";
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
                Component: InvestigationReasonPage,
              },
              {
                path: "print-corrigendum",
                Component: InvestigationPrintCorrigendumPage,
              },
              {
                path: "findings",
                Component: InvestigationFindingsPage,
              },
            ],
          },
        ],
      },
    ],
  },
];
