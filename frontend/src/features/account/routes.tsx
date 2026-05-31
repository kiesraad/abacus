import type { RouteObject } from "react-router";

import { roleValues } from "@/types/generated/openapi";
import { AccountSetupPage } from "./components/AccountSetupPage";
import { InitialiseApplicationPage } from "./components/InitialiseApplicationPage";
import { LoginLayout } from "./components/LoginLayout";
import { LoginPage } from "./components/LoginPage";
import { Logout } from "./components/Logout";

const allRoles = [...roleValues];

export const accountRoutes: RouteObject[] = [
  { path: "initialise", Component: InitialiseApplicationPage, handle: { public: true } },
  {
    Component: LoginLayout,
    children: [
      { path: "login", Component: LoginPage, handle: { public: true } },
      { path: "logout", Component: Logout, handle: { roles: allRoles } },
      {
        path: "setup",
        Component: AccountSetupPage,
        handle: { roles: allRoles },
      },
    ],
  },
];
