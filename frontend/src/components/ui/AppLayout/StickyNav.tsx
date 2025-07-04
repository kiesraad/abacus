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
      const setMaxHeight = () => {
        const navTop = nav.getBoundingClientRect().top;
        const maxHeight = window.innerHeight - navTop - 1;
        nav.style.maxHeight = `${maxHeight}px`;
      };

      window.addEventListener("resize", setMaxHeight);
      window.addEventListener("scroll", setMaxHeight);

      setMaxHeight();

      return () => {
        window.removeEventListener("scroll", setMaxHeight);
        window.removeEventListener("resize", setMaxHeight);
      };
    }
  }, []);

  return (
    <nav ref={navRef} className={cls.stickyNav}>
      {children}
    </nav>
  );
}
