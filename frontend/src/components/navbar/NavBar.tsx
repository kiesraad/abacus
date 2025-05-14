import { Link } from "react-router";

import { useApiState } from "@/api/useApiState";
import { t } from "@/i18n/translate";

import cls from "./NavBar.module.css";
import { NavBarLinks } from "./NavBarLinks";

type NavBarProps = { location: { pathname: string } };

export function NavBar({ location }: NavBarProps) {
  const { user } = useApiState();

  return (
    <nav aria-label="primary-navigation" className={cls.navBar}>
      <div className={cls.links}>
        <NavBarLinks location={location} />
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
