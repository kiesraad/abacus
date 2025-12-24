import { RouteObject } from "react-router";

import { UserCreateDetailsPage } from "./components/create/UserCreateDetailsPage";
import { UserCreateLayout } from "./components/create/UserCreateLayout";
import { UserCreateRolePage } from "./components/create/UserCreateRolePage";
import { UserCreateTypePage } from "./components/create/UserCreateTypePage";
import { UserListPage } from "./components/UserListPage";
import { UserUpdatePage } from "./components/update/UserUpdatePage";

export const usersRoutes: RouteObject[] = [
  { index: true, Component: UserListPage, handle: { roles: ["administrator", "coordinator"] } },
  {
    path: "create",
    Component: UserCreateLayout,
    children: [
      { index: true, Component: UserCreateRolePage, handle: { roles: ["administrator", "coordinator"] } },
      { path: "type", Component: UserCreateTypePage, handle: { roles: ["administrator", "coordinator"] } },
      { path: "details", Component: UserCreateDetailsPage, handle: { roles: ["administrator", "coordinator"] } },
    ],
  },
  {
    path: ":userId/update",
    Component: UserUpdatePage,
    handle: { roles: ["administrator", "coordinator"] },
  },
];
