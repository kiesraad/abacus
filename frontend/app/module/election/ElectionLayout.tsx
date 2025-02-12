import { Outlet, useLocation } from "react-router";

import { NavBar } from "app/component/navbar/NavBar";

import { ElectionProvider, ElectionStatusProvider } from "@kiesraad/api";
import { useNumericParam } from "@kiesraad/util";

export function ElectionLayout() {
  const electionId = useNumericParam("electionId");
  const location = useLocation();

  return (
    <ElectionProvider electionId={electionId}>
      <ElectionStatusProvider electionId={electionId}>
        <NavBar location={location} />
        <Outlet />
      </ElectionStatusProvider>
    </ElectionProvider>
  );
}
