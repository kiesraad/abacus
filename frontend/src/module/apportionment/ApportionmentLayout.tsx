import { Outlet } from "react-router";

import { Footer } from "@/component/footer/Footer";

import { ApportionmentProvider } from "@kiesraad/api";
import { useNumericParam } from "@kiesraad/util";

export function ApportionmentLayout() {
  const electionId = useNumericParam("electionId");

  return (
    <ApportionmentProvider electionId={electionId}>
      <Outlet />
      <Footer />
    </ApportionmentProvider>
  );
}
