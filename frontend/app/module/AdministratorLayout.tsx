import { Outlet } from "react-router-dom";

import { Footer } from "app/component/footer/Footer";

export function AdministratorLayout() {
  return (
    <div className="app-layout">
      <Outlet />
      <Footer />
    </div>
  );
}
