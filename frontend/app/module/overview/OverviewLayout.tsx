import { Footer } from "app/component/footer/Footer";
import { Outlet } from "react-router-dom";

export function OverviewLayout() {
  return (
    <div className="app-layout">
      <nav>Overzicht</nav>

      <Outlet />

      <Footer />
    </div>
  );
}
