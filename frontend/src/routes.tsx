import { createRoutesFromElements, Navigate, Route } from "react-router";

import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import { CheckAndSaveForm } from "@/components/form/data_entry/check_and_save/CheckAndSaveForm";
import { AccountSetupPage, LoginLayout, LoginPage, UserHomePage } from "@/features/account";
import { Logout } from "@/features/account/Logout";
import { AdministratorLayout } from "@/features/AdministratorLayout";
import {
  ApportionmentFullSeatsPage,
  ApportionmentLayout,
  ApportionmentPage,
  ApportionmentResidualSeatsPage,
} from "@/features/apportionment";
import {
  CandidatesVotesPage,
  DataEntryHomePage,
  DifferencesPage,
  RecountedPage,
  VotersAndVotesPage,
} from "@/features/data_entry";
import { DataEntryLayout } from "@/features/data_entry/DataEntryLayout";
import { DevHomePage } from "@/features/DevHomePage";
import {
  ElectionHomePage,
  ElectionLayout,
  ElectionReportPage,
  ElectionStatusPage,
  OverviewLayout,
  OverviewPage,
} from "@/features/election";
import { LogsHomePage } from "@/features/logs";
import { NotAvailableInMock } from "@/features/NotAvailableInMock";
import { NotFoundPage } from "@/features/NotFoundPage";
import { PollingStationListPage, PollingStationsLayout } from "@/features/polling_stations";
import { PollingStationCreatePage } from "@/features/polling_stations/page/PollingStationCreatePage";
import { PollingStationUpdatePage } from "@/features/polling_stations/page/PollingStationUpdatePage";
import { RootLayout } from "@/features/RootLayout";
import {
  UserCreateDetailsPage,
  UserCreateLayout,
  UserCreateRolePage,
  UserCreateTypePage,
  UserListPage,
  UserUpdatePage,
} from "@/features/users";
import { WorkstationsHomePage } from "@/features/workstations";

import { t } from "@kiesraad/i18n";

export const routes = createRoutesFromElements(
  <Route element={<RootLayout />} errorElement={<ErrorBoundary />}>
    <Route index path="/" element={<Navigate to="/dev" replace />} />
    <Route path="*" element={<NotFoundPage message="error.not_found" path={window.location.pathname} />} />
    <Route path="account" element={<LoginLayout />}>
      <Route index element={<UserHomePage />} />
      <Route path="login" element={<LoginPage />} />
      <Route path="logout" element={<Logout />} />
      <Route path="setup" element={<AccountSetupPage />} />
    </Route>
    <Route path="elections" element={<OverviewLayout />}>
      <Route index element={<OverviewPage />} />
      <Route path=":electionId" element={<ElectionLayout />}>
        <Route index element={<ElectionHomePage />} />
        <Route path="apportionment" element={<ApportionmentLayout />}>
          <Route index element={<ApportionmentPage />} />
          <Route path="details-residual-seats" element={<ApportionmentResidualSeatsPage />} />
          <Route path="details-full-seats" element={<ApportionmentFullSeatsPage />} />
        </Route>
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
          <Route path=":pollingStationId/:entryNumber" element={<DataEntryLayout />}>
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
        <Route path="create" element={<UserCreateLayout />}>
          <Route index element={<UserCreateRolePage />} />
          <Route path="type" element={<UserCreateTypePage />} />
          <Route path="details" element={<UserCreateDetailsPage />} />
        </Route>
        <Route path=":userId/update" element={<UserUpdatePage />} />
      </Route>
      <Route path="workstations" element={<WorkstationsHomePage />} />
    </Route>
  </Route>,
);
