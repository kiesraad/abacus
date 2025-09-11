import * as React from "react";

import cls from "./StickyNav.module.css";

export interface StickyNavProps {
  children: React.ReactNode;
}

export function StickyNav({ children }: StickyNavProps) {
  const navRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const nav = navRef.current;
    if (nav) {
      const updateTopOffset = () => {
        const navTop = nav.getBoundingClientRect().top;
        nav.style.setProperty("--sticky-nav-top-offset", `${Math.max(0, navTop)}px`);
        nav.style.paddingTop = navTop < 0 ? `${-navTop}px` : "";
      };

      window.addEventListener("resize", updateTopOffset);
      window.addEventListener("scroll", updateTopOffset);

      updateTopOffset();

      return () => {
        window.removeEventListener("scroll", updateTopOffset);
        window.removeEventListener("resize", updateTopOffset);
      };
    }
  }, []);

  return (
    <nav ref={navRef} className={cls.stickyNav}>
      {children}
    </nav>
  );
}
