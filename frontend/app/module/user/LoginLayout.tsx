import { Outlet } from "react-router-dom";

import { NavBar } from "app/component/navbar/NavBar.tsx";

export function LoginLayout() {
  return (
    <div className="app-layout">
      <NavBar />
      <Outlet />
    </div>
  );
}
