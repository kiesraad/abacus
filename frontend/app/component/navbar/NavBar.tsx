import { Link } from "react-router";

import { useApiState } from "@kiesraad/api";
import { t } from "@kiesraad/i18n";

import styles from "./NavBar.module.css";
import { NavBarLinks } from "./NavBarLinks";

type NavBarProps = { location: { pathname: string } };

export function NavBar({ location }: NavBarProps) {
  const { user } = useApiState();

  return (
    <nav aria-label="primary-navigation" className={styles.navBar}>
      <div className={styles.links}>
        <NavBarLinks location={location} />
      </div>
      <div className={styles.userInfo}>
        {user ? (
          <>
            <strong>{user.fullname || user.username}</strong>
            <span className={styles.lower}>({t(user.role)})</span>
            <Link to={`/account/logout`}>{t("account.logout")}</Link>
          </>
        ) : (
          <Link to={`/account/login`}>{t("account.login")}</Link>
        )}
      </div>
    </nav>
  );
}
