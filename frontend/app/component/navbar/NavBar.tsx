import { t } from "@kiesraad/i18n";
import { IconUser } from "@kiesraad/icon";

import styles from "./NavBar.module.css";
import { NavBarLinks } from "./NavBarLinks";

export function NavBar({ showLinks = true }) {
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
      <div className={styles.links}>{showLinks && <NavBarLinks />}</div>
      <div className={styles.userInfo}>
        <IconUser />
        <span>{role.join("/")}</span>
      </div>
    </nav>
  );
}
