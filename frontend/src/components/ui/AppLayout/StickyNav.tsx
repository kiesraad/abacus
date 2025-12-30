import { type ReactNode, useEffect, useRef } from "react";

import cls from "./StickyNav.module.css";

export interface StickyNavProps {
  children: ReactNode;
}

export function StickyNav({ children }: StickyNavProps) {
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const nav = navRef.current;
    const parent = nav?.parentElement;
    if (nav && parent) {
      nav.style.removeProperty("--sticky-nav-offset");

      // The sticky nav element is used inside a parent element (main)
      // the nav needs to stretch to the available height of the viewport,
      // but adjusted with a top and bottom offset that is used to set the max-height in CSS
      const updateTopAndBottomOffset = () => {
        const navTop = nav.getBoundingClientRect().top;

        const parentPaddingBottom = parseInt(getComputedStyle(parent).paddingBottom, 10);
        const parentBottom = parent.getBoundingClientRect().bottom;

        // Calculate visible parent bottom padding, based on element distance to bottom of viewport
        const visiblePadding = Math.max(parentPaddingBottom + window.innerHeight - parentBottom, 0);

        // If parent bottom padding is not fully into view, set padding of nav to 16, else use visible padding
        const bottomOffset = visiblePadding === 0 ? 16 : visiblePadding;
        const topOffset = Math.max(0, navTop);
        nav.style.setProperty("--sticky-nav-offset", `${topOffset + bottomOffset}px`);
      };

      window.addEventListener("resize", updateTopAndBottomOffset);
      window.addEventListener("scroll", updateTopAndBottomOffset);

      updateTopAndBottomOffset();

      return () => {
        window.removeEventListener("scroll", updateTopAndBottomOffset);
        window.removeEventListener("resize", updateTopAndBottomOffset);
      };
    }
  });

  return (
    <nav ref={navRef} className={cls.stickyNav}>
      {children}
    </nav>
  );
}
