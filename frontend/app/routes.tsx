import { createRoutesFromElements, Navigate, Route } from "react-router-dom";

import { CheckAndSaveForm } from "app/component/form/data_entry/check_and_save/CheckAndSaveForm";
import { FinaliseElectionPage } from "app/module/data_entry/page/FinaliseElectionPage";
import { NotAvailableInMock } from "app/module/NotAvailableInMock.tsx";

import { ErrorBoundary } from "./component/error/ErrorBoundry";
import {
  CandidatesVotesPage,
  DataEntryHomePage,
  DataEntryLayout,
  DifferencesPage,
  PollingStationLayout,
  RecountedPage,
  VotersAndVotesPage,
} from "./module/data_entry";
import { DevHomePage } from "./module/DevHomePage";
import { ElectionLayout } from "./module/ElectionLayout";
import { NotFound } from "./module/NotFound";
import { OverviewLayout, OverviewPage } from "./module/overview";
import { RootLayout } from "./module/RootLayout";
import { AccountSetupPage, LoginLayout, LoginPage, UserHomePage } from "./module/user";

export const routes = createRoutesFromElements(
  <Route element={<RootLayout />} errorElement={<ErrorBoundary />}>
    <Route index path="/" element={<Navigate to="/overview" replace />} />
    <Route path="*" element={<NotFound />} />
    <Route path="/dev" element={<DevHomePage />} />
    <Route path="user" element={<LoginLayout />}>
      <Route index element={<UserHomePage />} />
      <Route path="login" element={<LoginPage />} />
      <Route path="account/setup" element={<AccountSetupPage />} />
    </Route>
    <Route path="/overview" element={<OverviewLayout />}>
      <Route index element={<OverviewPage />} />
    </Route>
    <Route path="elections/:electionId" element={<ElectionLayout />}>
      <Route path="data-entry" element={<DataEntryLayout />}>
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
        <Route
          path="finalise"
          element={__API_MSW__ ? <NotAvailableInMock title="Invoerfase afronden - Abacus" /> : <FinaliseElectionPage />}
        />
      </Route>
    </Route>
  </Route>,
);
