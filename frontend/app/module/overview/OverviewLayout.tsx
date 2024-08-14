import { Outlet } from "react-router-dom";

import { Footer } from "app/component/footer/Footer";

import { ElectionListProvider } from "@kiesraad/api";
import { PageTitle } from "@kiesraad/ui";

export function OverviewLayout() {
  return (
    <div className="app-layout">
      <PageTitle title="Overzicht verkiezingen - Abacus" />
      <nav aria-label="primary-navigation">
        <span className="active">Overzicht</span>
      </nav>
      <ElectionListProvider>
        <Outlet />
      </ElectionListProvider>
      <Footer />
    </div>
  );
}
