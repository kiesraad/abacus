import { Outlet } from "react-router-dom";

export function RootLayout() {
  return (
    <div>
      <Outlet />
    </div>
  );
}
