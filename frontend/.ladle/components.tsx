import { StaticRouter } from "react-router-dom";

import type { GlobalProvider } from "@ladle/react";

import "../lib/ui/style/index.css";
import "./override.css";

export const Provider: GlobalProvider = ({ children }) => (
  // make things with RR links work
  <>
    <StaticRouter location="/">{children}</StaticRouter>
  </>
);
