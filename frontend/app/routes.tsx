import { createRoutesFromElements, Navigate, Route } from "react-router-dom";

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
import { UsersHomePage } from "app/module/users";
import { WorkstationsHomePage } from "app/module/workstations";

import { AccountSetupPage, LoginLayout, LoginPage, UserHomePage } from "./module/account";
import {
  CandidatesVotesPage,
  DataEntryHomePage,
  DifferencesPage,
  PollingStationLayout,
  RecountedPage,
  VotersAndVotesPage,
} from "./module/data_entry";
import { DevHomePage } from "./module/DevHomePage";
import { NotFound } from "./module/NotFound";
import { RootLayout } from "./module/RootLayout";

export const routes = createRoutesFromElements(
  <Route element={<RootLayout />}>
    <Route index path="/" element={<Navigate to="/elections" replace />} />
    <Route path="*" element={<NotFound />} />
    <Route path="account" element={<LoginLayout />}>
      <Route index element={<UserHomePage />} />
      <Route path="login" element={<LoginPage />} />
      <Route path="account/setup" element={<AccountSetupPage />} />
    </Route>
    <Route path="elections" element={<OverviewLayout />} errorElement={<NotFound />}>
      <Route index element={<OverviewPage />} />
      <Route path=":electionId" element={<ElectionLayout />} errorElement={<NotFound />}>
        <Route index element={<ElectionHomePage />} />
        <Route
          path="report"
          element={__API_MSW__ ? <NotAvailableInMock title="Invoerfase afronden - Abacus" /> : <ElectionReportPage />}
        />
        <Route path="status" element={<ElectionStatusPage />} />
        <Route path="data-entry" element={null}>
          <Route index element={<DataEntryHomePage />} />
          <Route path=":pollingStationId" element={<PollingStationLayout />}>
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
      <Route path="users" element={<UsersHomePage />} />
      <Route path="workstations" element={<WorkstationsHomePage />} />
    </Route>
  </Route>,
);
