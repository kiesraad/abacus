import * as React from "react";
import { useLocation } from "react-router-dom";

import { domtoren } from "@kiesraad/util";

import cls from "./StickyNav.module.css";

export interface StickyNavProps {
  children: React.ReactNode;
}

export function StickyNav({ children }: StickyNavProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const location = useLocation();

  const startHeight = React.useRef<number>(0);

  React.useEffect(() => {
    if (ref.current && startHeight.current) {
      ref.current.style.maxHeight = `${startHeight.current}px`;
    }
  }, [location]);

  React.useEffect(() => {
    if (ref.current) {
      const navEl = ref.current;
      const mainEl = domtoren(navEl).closest("main").el();

      let screenHeight = window.innerHeight;

      const onScroll = () => {
        const navTop = navEl.getBoundingClientRect().top;
        const mainBottom = mainEl.getBoundingClientRect().bottom;
        const height = Math.min(mainBottom, screenHeight - navTop);
        navEl.style.maxHeight = `${Math.ceil(height)}px`;
      };

      const onResize = () => {
        screenHeight = window.innerHeight;
        startHeight.current = navEl.clientHeight;
        onScroll();
      };

      onResize();
      window.addEventListener("resize", onResize);
      window.addEventListener("scroll", onScroll);

      return () => {
        window.removeEventListener("scroll", onScroll);
        window.removeEventListener("resize", onResize);
      };
    }
  }, []);

  return (
    <nav ref={ref} className={cls["sticky-nav"]}>
      {children}
    </nav>
  );
}
