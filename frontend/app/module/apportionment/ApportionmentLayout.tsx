import { Outlet } from "react-router";

import { ApportionmentProvider } from "@kiesraad/api";
import { useNumericParam } from "@kiesraad/util";

import { Footer } from "../../component/footer/Footer";

export function ApportionmentLayout() {
  const electionId = useNumericParam("electionId");

  return (
    <ApportionmentProvider electionId={electionId}>
      <Outlet />
      <Footer />
    </ApportionmentProvider>
  );
}
