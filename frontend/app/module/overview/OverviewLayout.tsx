import { Outlet } from "react-router-dom";

import { Footer } from "app/component/footer/Footer";

import { ElectionListProvider } from "@kiesraad/api";

export function OverviewLayout() {
  return (
    <div className="app-layout">
      <nav>
        <span className="active">Overzicht</span>
      </nav>
      <ElectionListProvider>
        <Outlet />
      </ElectionListProvider>
      <Footer />
    </div>
  );
}
