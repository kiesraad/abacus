import type { RouteObject } from "react-router";

import { AccountSetupPage } from "./components/AccountSetupPage";
import { InitialiseApplicationPage } from "./components/InitialiseApplicationPage";
import { LoginLayout } from "./components/LoginLayout";
import { LoginPage } from "./components/LoginPage";
import { Logout } from "./components/Logout";
import { UserHomePage } from "./components/UserHomePage";

export const accountRoutes: RouteObject[] = [
  { path: "initialise", Component: InitialiseApplicationPage, handle: { public: true } },
  {
    Component: LoginLayout,
    children: [
      { index: true, Component: UserHomePage, handle: { roles: ["administrator", "coordinator", "typist"] } },
      { path: "login", Component: LoginPage, handle: { public: true } },
      { path: "logout", Component: Logout, handle: { roles: ["administrator", "coordinator", "typist"] } },
      { path: "setup", Component: AccountSetupPage, handle: { roles: ["administrator", "coordinator", "typist"] } },
    ],
  },
];
