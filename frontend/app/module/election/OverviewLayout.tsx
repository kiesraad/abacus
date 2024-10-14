import { Outlet } from "react-router-dom";

import { Footer } from "app/component/footer/Footer";

import { ElectionListProvider } from "@kiesraad/api";

export function OverviewLayout() {
  return (
    <ElectionListProvider>
      <div className="app-layout">
        <Outlet />
        <Footer />
      </div>
    </ElectionListProvider>
  );
}
