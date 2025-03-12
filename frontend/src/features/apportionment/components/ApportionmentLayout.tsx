import { Outlet } from "react-router";

import { Footer } from "@/components/Footer";
import { ApportionmentProvider } from "@/features/apportionment/hooks/ApportionmentProvider";
import { useNumericParam } from "@/hooks/useNumericParam";

export function ApportionmentLayout() {
  const electionId = useNumericParam("electionId");

  return (
    <ApportionmentProvider electionId={electionId}>
      <Outlet />
      <Footer />
    </ApportionmentProvider>
  );
}
