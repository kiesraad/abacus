import { RouteObject } from "react-router";

import { NotAvailableInMock } from "@/components/error/NotAvailableInMock";
import { t } from "@/i18n/translate";

import { ElectionHomePage } from "./components/ElectionHomePage";
import { ElectionReportPage } from "./components/ElectionReportPage";
import { FinishDataEntryPage } from "./components/FinishDataEntryPage";
import { NumberOfVotersPage } from "./components/NumberOfVotersPage";

export const electionManagementRoutes: RouteObject[] = [
  { index: true, Component: ElectionHomePage },
  { path: "number-of-voters", Component: NumberOfVotersPage },
  {
    path: "report",
    children: [
      {
        index: true,
        Component: FinishDataEntryPage,
      },
      {
        path: "download",
        element: __API_MSW__ ? (
          <NotAvailableInMock title={`${t("election.title.finish_data_entry")} - Abacus`} />
        ) : (
          <ElectionReportPage />
        ),
      },
    ],
  },
];
