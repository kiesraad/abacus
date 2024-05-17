import { createRoutesFromElements, Route } from "react-router-dom";
import { RootLayout } from "./module/RootLayout";
import { HomePage } from "./module/HomePage";
import { InputLayout, InputHomePage, PollingStationPage } from "./module/input";
import { AccountSetupPage, LoginPage, LoginLayout, UserHomePage } from "./module/user";
import { OverviewLayout, OverviewPage } from "./module/overview";

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
      <Route path=":id/:section?" element={<PollingStationPage />} />
    </Route>
  </Route>,
);
