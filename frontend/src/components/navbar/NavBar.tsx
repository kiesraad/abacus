import { Link, useLocation } from "react-router";

import { useApiState } from "@/api/useApiState";
import { t } from "@/i18n/translate";

import cls from "./NavBar.module.css";
import { NavBarLinks } from "./NavBarLinks";

interface NavBarProps {
  location?: { pathname: string };
  empty?: boolean;
}

export function NavBar({ location, empty }: NavBarProps) {
  const { user } = useApiState();
  const currentLocation = useLocation();

  if (empty) {
    return <nav aria-label="primary-navigation" className={cls.navBar} />;
  }

  return (
    <nav aria-label="primary-navigation" className={cls.navBar}>
      <div className={cls.links}>
        <NavBarLinks location={location || currentLocation} />
      </div>
      <div className={cls.userInfo}>
        {user ? (
          <>
            <strong id="navbar-username">{user.fullname || user.username}</strong>
            <span className={cls.lower} id="navbar-role">
              ({t(user.role)})
            </span>
            <Link to={`/account/logout`}>{t("account.logout")}</Link>
          </>
        ) : (
          <Link to={`/account/login`}>{t("account.login")}</Link>
        )}
      </div>
    </nav>
  );
}
