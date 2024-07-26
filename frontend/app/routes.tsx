import { createRoutesFromElements, Route } from "react-router-dom";

import { ElectionLayout } from "./module/ElectionLayout";
import { HomePage } from "./module/HomePage";
import {
  CandidatesVotesPage,
  DifferencesPage,
  InputHomePage,
  InputLayout,
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
    <Route path="*" element={<NotFound />} />
    <Route index path="/" element={<HomePage />} />
    <Route path="user" element={<LoginLayout />}>
      <Route index element={<UserHomePage />} />
      <Route path="login" element={<LoginPage />} />
      <Route path="account/setup" element={<AccountSetupPage />} />
    </Route>
    <Route path="overview" element={<OverviewLayout />} errorElement={<NotFound />}>
      <Route index element={<OverviewPage />} />
    </Route>
    <Route path=":electionId" element={<ElectionLayout />} errorElement={<NotFound />}>
      <Route path="input" element={<InputLayout />}>
        <Route index element={<InputHomePage />} />
        <Route path=":pollingStationId/" element={<PollingStationLayout />}>
          <Route index path="recounted" element={<RecountedPage />} />
          <Route path="numbers" element={<VotersAndVotesPage />} />
          <Route path="differences" element={<DifferencesPage />} />
          <Route path="list/:listNumber" element={<CandidatesVotesPage />} />
          <Route path="save" element={<div>Placeholder Check and Save Page</div>} />
        </Route>
      </Route>
    </Route>
  </Route>,
);
