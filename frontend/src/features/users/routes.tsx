import { RouteObject } from "react-router";

import { UserCreateDetailsPage } from "./components/create/UserCreateDetailsPage";
import { UserCreateLayout } from "./components/create/UserCreateLayout";
import { UserCreateRolePage } from "./components/create/UserCreateRolePage";
import { UserCreateTypePage } from "./components/create/UserCreateTypePage";
import { UserUpdatePage } from "./components/update/UserUpdatePage";
import { UserListPage } from "./components/UserListPage";

export const usersRoutes: RouteObject[] = [
  {
    path: "users",
    children: [
      { index: true, element: <UserListPage /> },
      {
        path: "create",
        element: <UserCreateLayout />,
        children: [
          { index: true, element: <UserCreateRolePage /> },
          { path: "type", element: <UserCreateTypePage /> },
          { path: "details", element: <UserCreateDetailsPage /> },
        ],
      },
      {
        path: ":userId/update",
        element: <UserUpdatePage />,
      },
    ],
  },
];
