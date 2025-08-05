import { Outlet } from "react-router";

import { NavBar } from "@/components/navbar/NavBar";
import { AppLayout } from "@/components/ui/AppLayout/AppLayout";

export function LoginLayout() {
  return (
    <AppLayout>
      <NavBar />
      <Outlet />
    </AppLayout>
  );
}
