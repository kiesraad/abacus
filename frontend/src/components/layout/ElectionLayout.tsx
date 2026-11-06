import { Outlet } from "react-router";

import { NavBar } from "@/components/navbar/NavBar";
import { ElectionProvider } from "@/hooks/election/ElectionProvider";
import { ElectionStatusProvider } from "@/hooks/election/ElectionStatusProvider";
import { useNumericParam } from "@/hooks/useNumericParam";

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
