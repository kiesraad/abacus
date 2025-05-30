import { Outlet, useLocation } from "react-router";

import { NavBar } from "@/components/navbar/NavBar";
import { AppLayout } from "@/components/ui/AppLayout/AppLayout";

export function LoginLayout() {
  const location = useLocation();

  return (
    <AppLayout>
      <NavBar location={location} />
      <Outlet />
    </AppLayout>
  );
}
