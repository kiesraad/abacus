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

  const startNavTop = React.useRef<number>(0);

  //Reset the stickyNav height when navigating to not battle scrollRestoration
  React.useEffect(() => {
    if (ref.current && startNavTop.current) {
      ref.current.style.maxHeight = `${window.innerHeight - startNavTop.current}px`;
    }
  }, [location]);

  React.useEffect(() => {
    if (ref.current) {
      const navEl = ref.current;
      const mainEl = domtoren(navEl).closest("main").el();

      //store the top position of the nav element before becoming "sticky"
      startNavTop.current = navEl.getBoundingClientRect().top;

      let screenHeight = window.innerHeight;

      const onScroll = () => {
        const navTop = navEl.getBoundingClientRect().top;
        const mainBottom = mainEl.getBoundingClientRect().bottom;
        const height = Math.min(mainBottom, screenHeight - navTop);
        navEl.style.maxHeight = `${Math.ceil(height)}px`;
      };

      const onResize = () => {
        screenHeight = window.innerHeight;
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
