import { RouteObject } from "react-router";

import { t } from "@/lib/i18n";

import { ElectionReportPage } from "./components";

export const electionManagementRoutes: RouteObject[] = [
  {
    path: "report",
    element: __API_MSW__ ? <div>{`${t("election.title.finish_data_entry")} - Abacus`}</div> : <ElectionReportPage />,
  },
];
