import * as React from "react";

import { t } from "@kiesraad/i18n";
import { IconUser } from "@kiesraad/icon";

import styles from "./NavBar.module.css";

export function NavBar({ children }: { children?: React.ReactNode }) {
  const isAdministrator = location.hash.includes("administrator");
  const isCoordinator = location.hash.includes("coordinator");

  const role = [];

  if (isAdministrator || isCoordinator) {
    if (isAdministrator) {
      role.push(t("administrator"));
    }
    if (isCoordinator) {
      role.push(t("coordinator"));
    }
  } else {
    role.push(t("typist"));
  }

  return (
    <nav aria-label="primary-navigation" className={styles.navBar}>
      <div className={styles.links}>{children}</div>
      <div className={styles.userInfo}>
        <IconUser />
        <span>{role.join("/")}</span>
      </div>
    </nav>
  );
}
