import type { GlobalProvider } from "@ladle/react";
import { StaticRouter } from "react-router-dom/server";

import "../lib/ui/style/index.css";
import "./override.css";

export const Provider: GlobalProvider = ({ children }) => (
  // make things with RR links work
  <>
    <StaticRouter location="/">{children}</StaticRouter>
    <div id="modal"></div>
    <div id="tooltip">
      <aside></aside>
      <article>
        <div>!</div>
        <p></p>
      </article>
    </div>
  </>
);
