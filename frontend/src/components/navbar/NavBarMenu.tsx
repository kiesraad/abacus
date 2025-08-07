import * as React from "react";
import { NavLink } from "react-router";

import { IconCompass, IconFile, IconHamburger, IconUsers } from "@/components/generated/icons";
import { t } from "@/i18n/translate";

import cls from "./NavBar.module.css";

export function NavBarMenu() {
  return (
    <div className={cls.navBarMenu}>
      <NavLink to={"/elections"}>
        <IconCompass />
        {t("election.title.plural")}
      </NavLink>
      <NavLink to={"/users"}>
        <IconUsers />
        {t("users.users")}
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
        // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
        if (!document.querySelector(`.${cls.navBarMenu}`)?.contains(event.target as Node)) {
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
    <button className={cls.navBarMenuContainer} onClick={toggleMenu} title={t("menu")}>
      <IconHamburger />
      {isMenuVisible && <NavBarMenu />}
    </button>
  );
}
