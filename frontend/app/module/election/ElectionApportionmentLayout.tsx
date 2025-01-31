import { Outlet } from "react-router";

import { Footer } from "app/component/footer/Footer";

import { ElectionApportionmentProvider } from "@kiesraad/api";
import { useNumericParam } from "@kiesraad/util";

export function ElectionApportionmentLayout() {
  const electionId = useNumericParam("electionId");

  return (
    <ElectionApportionmentProvider electionId={electionId}>
      <Outlet />
      <Footer />
    </ElectionApportionmentProvider>
  );
}
