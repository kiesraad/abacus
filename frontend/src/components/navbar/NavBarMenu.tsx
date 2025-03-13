import * as React from "react";
import { NavLink } from "react-router";

import { IconCompass, IconFile, IconHamburger, IconLaptop, IconUsers } from "@/components/generated/icons";
import { t } from "@/utils/i18n/i18n";

import styles from "./NavBar.module.css";

export function NavBarMenu() {
  return (
    <div className={styles.navBarMenu}>
      <NavLink to={"/elections"}>
        <IconCompass />
        {t("election.title.plural")}
      </NavLink>
      <NavLink to={"/users"}>
        <IconUsers />
        {t("users.users")}
      </NavLink>
      <NavLink to={"/workstations"}>
        <IconLaptop />
        {t("workstations.workstations")}
      </NavLink>
      <NavLink to={"/logs"}>
        <IconFile />
        {t("logs")}
      </NavLink>
    </div>
  );
}

export function NavBarMenuButton() {
  const [isMenuVisible, setMenuVisible] = React.useState(false);

  React.useEffect(() => {
    if (isMenuVisible) {
      const handleClickOutside = (event: MouseEvent) => {
        if (!document.querySelector(`.${styles.navBarMenu}`)?.contains(event.target as Node)) {
          setMenuVisible(false);
        }
      };

      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isMenuVisible]);

  const toggleMenu = () => {
    setMenuVisible(!isMenuVisible);
  };

  return (
    <button className={styles.navBarMenuContainer} onClick={toggleMenu} title={t("menu")}>
      <IconHamburger />
      {isMenuVisible && <NavBarMenu />}
    </button>
  );
}
