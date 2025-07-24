import { Outlet } from "react-router";

import { MessagesProvider } from "@/hooks/messages/MessagesProvider";
import { UsersProvider } from "@/hooks/user/UsersProvider";

export function ElectionStatusLayout() {
  return (
    <UsersProvider>
      <MessagesProvider>
        <Outlet />
      </MessagesProvider>
    </UsersProvider>
  );
}
