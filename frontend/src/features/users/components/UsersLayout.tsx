import { Outlet } from "react-router";
import { MessagesProvider } from "@/hooks/messages/MessagesProvider";

export function UsersLayout() {
  return (
    <MessagesProvider>
      <Outlet />
    </MessagesProvider>
  );
}
