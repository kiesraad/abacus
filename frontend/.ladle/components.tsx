import { StaticRouter } from "react-router";

import type { GlobalProvider } from "@ladle/react";

import "@/components/ui/style/index.css";

import "./override.css";

export const Provider: GlobalProvider = ({ children }) => (
  // make things with RR links work
  <>
    <StaticRouter location="/">{children}</StaticRouter>
  </>
);
