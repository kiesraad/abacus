import { createRoutesFromElements, Navigate, Route } from "react-router-dom";

import { DevHomePage } from "./module/DevHomePage.tsx";
import { ElectionLayout } from "./module/ElectionLayout";
import {
  CandidatesVotesPage,
  DifferencesPage,
  InputHomePage,
  InputLayout,
  PollingStationHomePage,
  PollingStationLayout,
  RecountedPage,
  VotersAndVotesPage,
} from "./module/input";
import { NotFound } from "./module/NotFound";
import { OverviewLayout, OverviewPage } from "./module/overview";
import { RootLayout } from "./module/RootLayout";
import { AccountSetupPage, LoginLayout, LoginPage, UserHomePage } from "./module/user";

export const routes = createRoutesFromElements(
  <Route element={<RootLayout />}>
    <Route index path="/" element={<Navigate to="/overview" replace />} />
    <Route path="*" element={<NotFound />} />
    <Route path="/dev" element={<DevHomePage />} />
    <Route path="user" element={<LoginLayout />}>
      <Route index element={<UserHomePage />} />
      <Route path="login" element={<LoginPage />} />
      <Route path="account/setup" element={<AccountSetupPage />} />
    </Route>
    <Route path="/overview" element={<OverviewLayout />} errorElement={<NotFound />}>
      <Route index element={<OverviewPage />} />
    </Route>
    <Route path=":electionId" element={<ElectionLayout />} errorElement={<NotFound />}>
      <Route path="input" element={<InputLayout />}>
        <Route index element={<InputHomePage />} />
        <Route path=":pollingStationId" element={<PollingStationLayout />}>
          <Route index element={<PollingStationHomePage />} />
          <Route path="recounted" element={<RecountedPage />} />
          <Route path="numbers" element={<VotersAndVotesPage />} />
          <Route path="differences" element={<DifferencesPage />} />
          <Route path="list/:listNumber" element={<CandidatesVotesPage />} />
          <Route path="save" element={<div>Placeholder Check and Save Page</div>} />
        </Route>
      </Route>
    </Route>
  </Route>,
);
