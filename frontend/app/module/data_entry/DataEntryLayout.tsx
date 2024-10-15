import { Outlet } from "react-router-dom";

import { Footer } from "app/component/footer/Footer";

import { ElectionStatusProvider, useElection } from "@kiesraad/api";
import { AppLayout } from "@kiesraad/ui";

export function DataEntryLayout() {
  const { election } = useElection();
  return (
    <ElectionStatusProvider electionId={election.id}>
      <AppLayout>
        <Outlet />
        <Footer />
      </AppLayout>
    </ElectionStatusProvider>
  );
}
