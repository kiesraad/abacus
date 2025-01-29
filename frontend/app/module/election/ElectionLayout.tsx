import { Outlet } from "react-router";

import { ElectionProvider, ElectionStatusProvider } from "@kiesraad/api";
import { useNumericParam } from "@kiesraad/util";

import { NavBar } from "../../component/navbar/NavBar";

export function ElectionLayout() {
  const electionId = useNumericParam("electionId");

  return (
    <ElectionProvider electionId={electionId}>
      <ElectionStatusProvider electionId={electionId}>
        <NavBar />
        <Outlet />
      </ElectionStatusProvider>
    </ElectionProvider>
  );
}
