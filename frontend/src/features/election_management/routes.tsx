import { RouteObject } from "react-router";

import { NotAvailableInMock } from "@/components/error/NotAvailableInMock";
import { t } from "@/i18n/translate";

import { ElectionReportPage } from "./components/ElectionReportPage";

export const electionManagementRoutes: RouteObject[] = [
  {
    index: true,
    element: __API_MSW__ ? (
      <NotAvailableInMock title={`${t("election.title.finish_data_entry")} - Abacus`} />
    ) : (
      <ElectionReportPage />
    ),
  },
];
