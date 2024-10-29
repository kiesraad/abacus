import { Outlet } from "react-router-dom";

import { ElectionStatusProvider } from "@kiesraad/api";
import { useNumericParam } from "@kiesraad/util";

export function ElectionLayout() {
  const electionId = useNumericParam("electionId");

  return (
    <ElectionStatusProvider electionId={electionId}>
      <Outlet />
    </ElectionStatusProvider>
  );
}
