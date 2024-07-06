import { createRoutesFromElements, Route } from "react-router-dom";
import { HomePage } from "./module/HomePage";
import {
  CandidatesVotesPage,
  InputLayout,
  InputHomePage,
  PollingStationLayout,
  VotersAndVotesPage,
} from "./module/input";
import { OverviewLayout, OverviewPage } from "./module/overview";
import { RootLayout } from "./module/RootLayout";
import { AccountSetupPage, LoginPage, LoginLayout, UserHomePage } from "./module/user";

export const routes = createRoutesFromElements(
  <Route element={<RootLayout />}>
    <Route path="*" element={<div>Not found</div>} />
    <Route index path="/" element={<HomePage />} />
    <Route path="user" element={<LoginLayout />}>
      <Route index element={<UserHomePage />} />
      <Route path="login" element={<LoginPage />} />
      <Route path="account/setup" element={<AccountSetupPage />} />
    </Route>
    <Route path="overview" element={<OverviewLayout />}>
      <Route index element={<OverviewPage />} />
    </Route>
    <Route path="input" element={<InputLayout />}>
      <Route index element={<InputHomePage />} />
      <Route path=":id/" element={<PollingStationLayout />}>
        <Route index path="recount" element={<div>Placeholder Recount Page</div>} />
        <Route path="numbers" element={<VotersAndVotesPage />} />
        <Route path="differences" element={<div>Placeholder Differences Page</div>} />
        <Route path="list/:listNumber" element={<CandidatesVotesPage />} />
        <Route path="save" element={<div>Placeholder Check and Save Page</div>} />
      </Route>
    </Route>
  </Route>,
);
