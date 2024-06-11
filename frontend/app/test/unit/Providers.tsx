import * as React from "react";
import { BrowserRouter } from "react-router-dom";
import { ApiProvider } from "@kiesraad/api";

export const Providers = ({ children }: { children: React.ReactNode }) => {
  return (
    <React.StrictMode>
      <BrowserRouter>
        <ApiProvider host="http://testhost">
          {/* TODO: Tests still fail with 'Error: Tooltip root element not found' */}
          <div id="modal"></div>
          <div id="tooltip">
            <aside></aside>
            <article>
              <div>!</div>
              <p></p>
            </article>
          </div>
          {children}
        </ApiProvider>
      </BrowserRouter>
    </React.StrictMode>
  );
};
