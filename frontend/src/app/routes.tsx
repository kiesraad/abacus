import { createRoutesFromElements, Navigate, Route } from "react-router";

import { AccountSetupPage } from "@/features/account/components/AccountSetupPage";
import { LoginLayout } from "@/features/account/components/LoginLayout";
import { LoginPage } from "@/features/account/components/LoginPage";
import { Logout } from "@/features/account/components/Logout";
import { UserHomePage } from "@/features/account/components/UserHomePage";
import { ApportionmentLayout } from "@/features/apportionment/components/ApportionmentLayout";
import { ApportionmentPage } from "@/features/apportionment/components/ApportionmentPage";
import { ApportionmentFullSeatsPage } from "@/features/apportionment/components/full_seats/ApportionmentFullSeatsPage";
import { ApportionmentListDetailsPage } from "@/features/apportionment/components/list_details/ApportionmentListDetailsPage";
import { ApportionmentResidualSeatsPage } from "@/features/apportionment/components/residual_seats/ApportionmentResidualSeatsPage";
import { CandidatesVotesPage } from "@/features/data_entry/components/candidates_votes/CandidatesVotesPage";
import { CheckAndSavePage } from "@/features/data_entry/components/check_and_save/CheckAndSavePage";
import { DataEntryLayout } from "@/features/data_entry/components/DataEntryLayout";
import { DifferencesPage } from "@/features/data_entry/components/differences/DifferencesPage";
import { RecountedPage } from "@/features/data_entry/components/recounted/RecountedPage";
import { VotersAndVotesPage } from "@/features/data_entry/components/voters_and_votes/VotersAndVotesPage";
import { DataEntryChoicePage } from "@/features/data_entry_choice/components/DataEntryChoicePage";
import { ElectionCreatePage } from "@/features/election_management/components";
import { ElectionHomePage } from "@/features/election_management/components/ElectionHomePage";
import { ElectionReportPage } from "@/features/election_management/components/ElectionReportPage";
import { OverviewLayout } from "@/features/election_overview/components/OverviewLayout";
import { OverviewPage } from "@/features/election_overview/components/OverviewPage";
import { ElectionStatusPage } from "@/features/election_status/components/ElectionStatusPage";
import { LogsHomePage } from "@/features/logs/components/LogsHomePage";
import { PollingStationCreatePage } from "@/features/polling_stations/components/PollingStationCreatePage";
import { PollingStationListPage } from "@/features/polling_stations/components/PollingStationListPage";
import { PollingStationsLayout } from "@/features/polling_stations/components/PollingStationsLayout";
import { PollingStationUpdatePage } from "@/features/polling_stations/components/PollingStationUpdatePage";
import { ResolveDifferencesPage } from "@/features/resolve_differences/components/ResolveDifferencesPage";
import { UserCreateDetailsPage } from "@/features/users/components/create/UserCreateDetailsPage";
import { UserCreateLayout } from "@/features/users/components/create/UserCreateLayout";
import { UserCreateRolePage } from "@/features/users/components/create/UserCreateRolePage";
import { UserCreateTypePage } from "@/features/users/components/create/UserCreateTypePage";
import { UserUpdatePage } from "@/features/users/components/update/UserUpdatePage";
import { UserListPage } from "@/features/users/components/UserListPage";
import { WorkstationsHomePage } from "@/features/workstations/components/WorkstationsHomePage";
import { t } from "@/lib/i18n";

import { AdministratorLayout } from "./AdministratorLayout";
import { DevHomePage } from "./DevHomePage";
import { ElectionLayout } from "./ElectionLayout";
import { ErrorBoundary } from "./ErrorBoundary";
import { NotAvailableInMock } from "./NotAvailableInMock";
import { NotFoundPage } from "./NotFoundPage";
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
      <Route path="create" element={<ElectionCreatePage />} />
      <Route path=":electionId" element={<ElectionLayout />}>
        <Route index element={<ElectionHomePage />} />
        <Route path="apportionment" element={<ApportionmentLayout />}>
          <Route index element={<ApportionmentPage />} />
          <Route path=":pgNumber" element={<ApportionmentListDetailsPage />} />
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
        <Route path="status" element={null}>
          <Route index element={<ElectionStatusPage />} />
          <Route path=":pollingStationId/resolve-differences" element={<ResolveDifferencesPage />} />
        </Route>
        <Route path="polling-stations" element={<PollingStationsLayout />}>
          <Route index element={<PollingStationListPage />} />
          <Route path="create" element={<PollingStationCreatePage />} />
          <Route path=":pollingStationId/update" element={<PollingStationUpdatePage />} />
        </Route>
        <Route path="data-entry" element={null}>
          <Route index element={<DataEntryChoicePage />} />
          <Route path=":pollingStationId/:entryNumber" element={<DataEntryLayout />}>
            <Route index element={null} />
            <Route path="recounted" element={<RecountedPage />} />
            <Route path="voters-and-votes" element={<VotersAndVotesPage />} />
            <Route path="differences" element={<DifferencesPage />} />
            <Route path="list/:listNumber" element={<CandidatesVotesPage />} />
            <Route path="save" element={<CheckAndSavePage />} />
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
