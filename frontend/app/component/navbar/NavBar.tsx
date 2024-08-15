import * as React from "react";

import { IconUser } from "@kiesraad/icon";

import styles from "./NavBar.module.css";

export function NavBar({ children }: { children?: React.ReactNode }) {
  return (
    <nav aria-label="primary-navigation" className={styles.navBar}>
      <div className={styles.links}>{children}</div>
      <div className={styles.userInfo}>
        <IconUser />
        <span>Invoerder</span>
      </div>
    </nav>
  );
}
