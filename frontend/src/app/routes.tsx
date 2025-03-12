import { createRoutesFromElements, Navigate, Route } from "react-router";

import { t } from "@kiesraad/i18n";

import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import { NotFoundPage } from "@/components/error/NotFoundPage";
import { AccountSetupPage } from "@/features/account/components/AccountSetupPage";
import { LoginLayout } from "@/features/account/components/LoginLayout";
import { LoginPage } from "@/features/account/components/LoginPage";
import { Logout } from "@/features/account/components/Logout";
import { UserHomePage } from "@/features/account/components/UserHomePage";
import { AdministratorLayout } from "@/features/administrator/components/AdministratorLayout";
import { DevHomePage } from "@/features/administrator/components/DevHomePage";
import { LogsHomePage } from "@/features/administrator/components/LogsHomePage";
import { ApportionmentLayout } from "@/features/apportionment/components/ApportionmentLayout";
import { ApportionmentPage } from "@/features/apportionment/components/ApportionmentPage";
import { ApportionmentFullSeatsPage } from "@/features/apportionment/components/full/ApportionmentFullSeatsPage";
import { ApportionmentResidualSeatsPage } from "@/features/apportionment/components/residual/ApportionmentResidualSeatsPage";
import { CandidatesVotesPage } from "@/features/data_entry/components/candidates_votes/CandidatesVotesPage";
import { CheckAndSaveForm } from "@/features/data_entry/components/check_and_save/CheckAndSaveForm";
import { DataEntryHomePage } from "@/features/data_entry/components/DataEntryHomePage";
import { DataEntryLayout } from "@/features/data_entry/components/DataEntryLayout";
import { DifferencesPage } from "@/features/data_entry/components/differences/DifferencesPage";
import { RecountedPage } from "@/features/data_entry/components/recounted/RecountedPage";
import { VotersAndVotesPage } from "@/features/data_entry/components/voters_and_votes/VotersAndVotesPage";
import { ElectionHomePage } from "@/features/election/components/ElectionHomePage";
import { ElectionLayout } from "@/features/election/components/ElectionLayout";
import { OverviewLayout } from "@/features/election/components/OverviewLayout";
import { OverviewPage } from "@/features/election/components/OverviewPage";
import { ElectionReportPage } from "@/features/election/components/report/ElectionReportPage";
import { ElectionStatusPage } from "@/features/election/components/status/ElectionStatusPage";
import { PollingStationCreatePage } from "@/features/polling_stations/components/PollingStationCreatePage";
import { PollingStationListPage } from "@/features/polling_stations/components/PollingStationListPage";
import { PollingStationsLayout } from "@/features/polling_stations/components/PollingStationsLayout";
import { PollingStationUpdatePage } from "@/features/polling_stations/components/PollingStationUpdatePage";
import { UserCreateDetailsPage } from "@/features/users/components/create/UserCreateDetailsPage";
import { UserCreateLayout } from "@/features/users/components/create/UserCreateLayout";
import { UserCreateRolePage } from "@/features/users/components/create/UserCreateRolePage";
import { UserCreateTypePage } from "@/features/users/components/create/UserCreateTypePage";
import { UserUpdatePage } from "@/features/users/components/update/UserUpdatePage";
import { UserListPage } from "@/features/users/components/UserListPage";
import { WorkstationsHomePage } from "@/features/workstations/components/WorkstationsHomePage";

import { NotAvailableInMock } from "./NotAvailableInMock";
import { RootLayout } from "./RootLayout";

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
