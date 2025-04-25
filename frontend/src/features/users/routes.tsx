import { RouteObject } from "react-router";

import { UserCreateDetailsPage } from "./components/create/UserCreateDetailsPage";
import { UserCreateLayout } from "./components/create/UserCreateLayout";
import { UserCreateRolePage } from "./components/create/UserCreateRolePage";
import { UserCreateTypePage } from "./components/create/UserCreateTypePage";
import { UserUpdatePage } from "./components/update/UserUpdatePage";
import { UserListPage } from "./components/UserListPage";

export const usersRoutes: RouteObject[] = [
  { index: true, Component: UserListPage },
  {
    path: "create",
    Component: UserCreateLayout,
    children: [
      { index: true, Component: UserCreateRolePage },
      { path: "type", Component: UserCreateTypePage },
      { path: "details", Component: UserCreateDetailsPage },
    ],
  },
  {
    path: ":userId/update",
    Component: UserUpdatePage,
  },
];
