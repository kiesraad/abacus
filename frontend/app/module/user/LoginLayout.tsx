import { Outlet } from "react-router-dom";

export function LoginLayout() {
  return (
    <div className="app-layout">
      <nav></nav>
      <Outlet />
    </div>
  );
}
