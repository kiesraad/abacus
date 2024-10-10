import { Outlet } from "react-router-dom";

import { ElectionProvider } from "@kiesraad/api";
import { useNumericParam } from "@kiesraad/util";

export function ElectionLayout() {
  const electionId = useNumericParam("electionId");

  return (
    <ElectionProvider electionId={electionId}>
      <Outlet />
    </ElectionProvider>
  );
}
