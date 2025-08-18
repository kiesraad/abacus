import { RouteObject } from "react-router";

import { NotAvailableInMock } from "@/components/error/NotAvailableInMock";
import { t } from "@/i18n/translate";

import { ElectionHomePage } from "./components/ElectionHomePage";
import { ElectionLayout } from "./components/ElectionLayout";
import { ElectionReportPage } from "./components/report/ElectionReportPage";
import { FinishDataEntryPage } from "./components/report/FinishDataEntryPage";
import { CommitteeSessionDetailsPage } from "./components/update/CommitteeSessionDetailsPage";
import { NumberOfVotersPage } from "./components/update/NumberOfVotersPage";

export const electionManagementRoutes: RouteObject[] = [
  {
    path: "",
    Component: ElectionLayout,
    children: [
      {
        index: true,
        Component: ElectionHomePage,
      },
    ],
  },
  { path: "details", Component: CommitteeSessionDetailsPage },
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
