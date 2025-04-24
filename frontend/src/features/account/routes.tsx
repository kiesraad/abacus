import { RouteObject } from "react-router";

import { AccountSetupPage } from "./components/AccountSetupPage";
import { LoginLayout } from "./components/LoginLayout";
import { LoginPage } from "./components/LoginPage";
import { Logout } from "./components/Logout";
import { UserHomePage } from "./components/UserHomePage";

export const accountRoutes: RouteObject[] = [
  {
    element: <LoginLayout />,
    children: [
      { index: true, element: <UserHomePage /> },
      { path: "login", element: <LoginPage /> },
      { path: "logout", element: <Logout /> },
      { path: "setup", element: <AccountSetupPage /> },
    ],
  },
];
