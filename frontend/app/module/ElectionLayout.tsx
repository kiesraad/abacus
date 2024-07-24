import { Outlet, useParams } from "react-router-dom";

import { ElectionProvider } from "@kiesraad/api";

export function ElectionLayout() {
  const { electionId } = useParams();
  return (
    <ElectionProvider electionId={parseInt(electionId ?? "", 10)}>
      <Outlet />
    </ElectionProvider>
  );
}
