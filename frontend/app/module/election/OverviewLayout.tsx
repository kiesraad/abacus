import { Outlet } from "react-router-dom";

import { Footer } from "app/component/footer/Footer.tsx";
import { NavBar } from "app/component/navbar/NavBar.tsx";

import { ElectionListProvider } from "@kiesraad/api";
import { PageTitle } from "@kiesraad/ui";

export function OverviewLayout() {
  return (
    <div className="app-layout">
      <PageTitle title="Overzicht verkiezingen - Abacus" />
      <ElectionListProvider>
        <NavBar />
        <Outlet />
        <Footer />
      </ElectionListProvider>
    </div>
  );
}
