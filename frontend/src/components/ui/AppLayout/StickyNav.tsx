import * as React from "react";

import cls from "./StickyNav.module.css";

export interface StickyNavProps {
  children: React.ReactNode;
}

export function StickyNav({ children }: StickyNavProps) {
  const navRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const nav = navRef.current;
    const parent = nav && nav.parentElement;
    if (nav && parent) {
      nav.style.removeProperty("--sticky-nav-offset");

      // The sticky nav element is used inside a parent element (main)
      // the nav needs to stretch to the available height of the viewport,
      // but adjusted with a top and bottom offset that is used to set the max-height in css
      const updateTopAndBottomOffset = () => {
        const navTop = nav.getBoundingClientRect().top;

        const parentPaddingBottom = parseInt(getComputedStyle(parent).paddingBottom);
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
