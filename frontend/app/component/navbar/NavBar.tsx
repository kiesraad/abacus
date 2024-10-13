import * as React from "react";

import { IconUser } from "@kiesraad/icon";

import styles from "./NavBar.module.css";

export function NavBar({ children }: { children?: React.ReactNode }) {
  const isAdministrator = location.hash === "#administrator";

  return (
    <nav aria-label="primary-navigation" className={styles.navBar}>
      <div className={styles.links}>{children}</div>
      <div className={styles.userInfo}>
        <IconUser style={{ fill: "white" }} />
        <span>{isAdministrator ? "Beheerder" : "Invoerder"}</span>
      </div>
    </nav>
  );
}
