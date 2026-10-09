import { Outlet } from "react-router";

import { UsersProvider } from "@/hooks/user/UsersProvider";

export function ElectionStatusLayout() {
  return (
    <UsersProvider>
      <Outlet />
    </UsersProvider>
  );
}
