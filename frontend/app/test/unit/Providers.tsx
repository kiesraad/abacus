import * as React from "react";
import { StrictMode } from "react";
import { ApiProvider } from "@kiesraad/api";

export const Providers = ({ children }: { children: React.ReactNode }) => {
  return (
    <StrictMode>
      <ApiProvider host="http://testhost">{children}</ApiProvider>
    </StrictMode>
  );
};
