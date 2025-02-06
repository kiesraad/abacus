import { createRoutesFromElements, Navigate, Route } from "react-router";

import { CheckAndSaveForm } from "app/component/form/data_entry/check_and_save/CheckAndSaveForm";
import { AdministratorLayout } from "app/module/AdministratorLayout";
import {
  ElectionHomePage,
  ElectionLayout,
  ElectionReportPage,
  ElectionStatusPage,
  OverviewLayout,
  OverviewPage,
} from "app/module/election";
import { LogsHomePage } from "app/module/logs";
import { NotAvailableInMock } from "app/module/NotAvailableInMock";
import { PollingStationListPage, PollingStationsLayout } from "app/module/polling_stations";
import { UserListPage } from "app/module/users";
import { WorkstationsHomePage } from "app/module/workstations";

import { t } from "@kiesraad/i18n";

import { ErrorBoundary } from "./component/error/ErrorBoundary";
import { AccountSetupPage, LoginLayout, LoginPage, UserHomePage } from "./module/account";
import { ChangePasswordPage } from "./module/account/page/ChangePasswordPage";
import {
  CandidatesVotesPage,
  DataEntryHomePage,
  DifferencesPage,
  PollingStationLayout,
  RecountedPage,
  VotersAndVotesPage,
} from "./module/data_entry";
import { DevHomePage } from "./module/DevHomePage";
import { NotFoundPage } from "./module/NotFoundPage";
import { PollingStationCreatePage } from "./module/polling_stations/page/PollingStationCreatePage";
import { PollingStationUpdatePage } from "./module/polling_stations/page/PollingStationUpdatePage";
import { RootLayout } from "./module/RootLayout";

export const routes = createRoutesFromElements(
  <Route element={<RootLayout />} errorElement={<ErrorBoundary />}>
    <Route index path="/" element={<Navigate to="/dev" replace />} />
    <Route path="*" element={<NotFoundPage message="error.not_found" path={window.location.pathname} />} />
    <Route path="account" element={<LoginLayout />}>
      <Route index element={<UserHomePage />} />
      <Route path="login" element={<LoginPage />} />
      <Route path="setup" element={<AccountSetupPage />} />
      <Route path="change-password" element={<ChangePasswordPage />} />
    </Route>
    <Route path="elections" element={<OverviewLayout />}>
      <Route index element={<OverviewPage />} />
      <Route path=":electionId" element={<ElectionLayout />}>
        <Route index element={<ElectionHomePage />} />
        <Route
          path="report"
          element={
            __API_MSW__ ? (
              <NotAvailableInMock title={`${t("election.title.finish_data_entry")} - Abacus`} />
            ) : (
              <ElectionReportPage />
            )
          }
        />
        <Route path="status" element={<ElectionStatusPage />} />
        <Route path="polling-stations" element={<PollingStationsLayout />}>
          <Route index element={<PollingStationListPage />} />
          <Route path="create" element={<PollingStationCreatePage />} />
          <Route path=":pollingStationId/update" element={<PollingStationUpdatePage />} />
        </Route>
        <Route path="data-entry" element={null}>
          <Route index element={<DataEntryHomePage />} />
          <Route path=":pollingStationId/:entryNumber" element={<PollingStationLayout />}>
            {/* The PollingStationFormController will navigate to the correct section. */}
            <Route index element={null} />
            <Route path="recounted" element={<RecountedPage />} />
            <Route path="voters-and-votes" element={<VotersAndVotesPage />} />
            <Route path="differences" element={<DifferencesPage />} />
            <Route path="list/:listNumber" element={<CandidatesVotesPage />} />
            <Route path="save" element={<CheckAndSaveForm />} />
          </Route>
        </Route>
      </Route>
    </Route>
    <Route element={<AdministratorLayout />}>
      <Route path="dev" element={<DevHomePage />} />
      <Route path="logs" element={<LogsHomePage />} />
      <Route path="users">
        <Route index element={<UserListPage />} />
      </Route>
      <Route path="workstations" element={<WorkstationsHomePage />} />
    </Route>
  </Route>,
);
