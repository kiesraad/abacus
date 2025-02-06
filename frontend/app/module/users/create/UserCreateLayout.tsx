import { Outlet } from "react-router";

import { UserCreateContextProvider } from "./UserCreateContextProvider";

export function UserCreateLayout() {
  return (
    <UserCreateContextProvider>
      <Outlet />
    </UserCreateContextProvider>
  );
}
