import { RouteObject } from "react-router";

import { AccountSetupPage } from "./components/AccountSetupPage";
import { InitialiseApplication } from "./components/InitialiseApplication";
import { LoginLayout } from "./components/LoginLayout";
import { LoginPage } from "./components/LoginPage";
import { Logout } from "./components/Logout";
import { UserHomePage } from "./components/UserHomePage";

export const accountRoutes: RouteObject[] = [
  {
    Component: LoginLayout,
    children: [
      { index: true, Component: UserHomePage },
      { path: "initialise", Component: InitialiseApplication },
      { path: "login", Component: LoginPage },
      { path: "logout", Component: Logout },
      { path: "setup", Component: AccountSetupPage },
    ],
  },
];
