import * as React from "react";
import { StrictMode } from "react";
import { ApiProvider } from "@kiesraad/api";
import { BrowserRouter } from "react-router-dom";

export const Providers = ({ children }: { children: React.ReactNode }) => {
  return (
    <StrictMode>
      <BrowserRouter>
        <ApiProvider host="http://testhost">{children}</ApiProvider>
      </BrowserRouter>
    </StrictMode>
  );
};
