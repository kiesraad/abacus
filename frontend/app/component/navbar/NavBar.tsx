import * as React from "react";

import { IconUser } from "@kiesraad/icon";

export const NavBar = ({ children }: { children: React.ReactNode }) => {
  return (
    <nav aria-label="primary-navigation">
      <div className="links">{children}</div>
      <div className="userInfo">
        <IconUser />
        <span>Invoerder</span>
      </div>
    </nav>
  );
};
