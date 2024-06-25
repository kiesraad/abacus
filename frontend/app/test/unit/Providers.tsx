import * as React from "react";
import { BrowserRouter } from "react-router-dom";
import { ApiProvider } from "@kiesraad/api";

export const Providers = ({ children }: { children: React.ReactNode }) => {
  return (
    <BrowserRouter>
      <ApiProvider host="http://testhost">{children}</ApiProvider>
    </BrowserRouter>
  );
};
