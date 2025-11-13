import { RouteObject } from "react-router";

import { NotAvailableInMock } from "@/components/error/NotAvailableInMock";
import { t } from "@/i18n/translate";

import { ElectionHomePage } from "./components/ElectionHomePage";
import { ElectionReportPage } from "./components/report/ElectionReportPage";
import { FinishDataEntryPage } from "./components/report/FinishDataEntryPage";
import { CommitteeSessionDetailsPage } from "./components/update/CommitteeSessionDetailsPage";
import { NumberOfVotersPage } from "./components/update/NumberOfVotersPage";

export const electionManagementRoutes: RouteObject[] = [
  { index: true, Component: ElectionHomePage, handle: { roles: ["administrator", "coordinator"] } },
  { path: "details", Component: CommitteeSessionDetailsPage, handle: { roles: ["coordinator"] } },
  { path: "number-of-voters", Component: NumberOfVotersPage, handle: { roles: ["administrator", "coordinator"] } },
  {
    path: "report",
    children: [
      {
        index: true,
        Component: FinishDataEntryPage,
        handle: { roles: ["coordinator"] },
      },
      {
        path: "committee-session/:committeeSessionId/download",
        children: [
          {
            index: true,
            element: __API_MSW__ ? (
              <NotAvailableInMock title={`${t("election.title.finish_data_entry")} - Abacus`} />
            ) : (
              <ElectionReportPage />
            ),
            handle: { roles: ["coordinator"] },
          },
        ],
      },
    ],
  },
];
