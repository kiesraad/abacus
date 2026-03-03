import { Outlet } from "react-router";

import { Footer } from "@/components/footer/Footer";
import { useNumericParam } from "@/hooks/useNumericParam";

import { ApportionmentProvider } from "./ApportionmentProvider";

export function ApportionmentLayout() {
  const electionId = useNumericParam("electionId");

  return (
    <ApportionmentProvider electionId={electionId}>
      <Outlet />
      <Footer />
    </ApportionmentProvider>
  );
}
