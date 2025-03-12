import * as React from "react";

import { cn } from "@/utils";

import cls from "./ProgressList.module.css";

export interface ProgressListScrollProps {
  children: React.ReactNode;
}
export function ProgressListScroll({ children }: ProgressListScrollProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const listRef = React.useRef<HTMLUListElement>(null);

  React.useEffect(() => {
    const scrollContainer = containerRef.current;
    const scrollList = listRef.current;

    if (scrollContainer && scrollList) {
      const onScroll = () => {
        const scrollTop = scrollList.scrollTop;
        const scrollHeight = scrollList.scrollHeight;
        const clientHeight = scrollList.clientHeight;

        if (scrollHeight > clientHeight) {
          scrollContainer.classList.add("has-scrolling");
        }

        //check for gradient visibility

        // Toggle bottom gradient visibility
        if (scrollTop > 0) {
          scrollContainer.classList.add("show-top-gradient");
        } else {
          scrollContainer.classList.remove("show-top-gradient");
        }

        // Toggle bottom gradient visibility
        if (scrollTop + clientHeight < scrollHeight) {
          scrollContainer.classList.add("show-bottom-gradient");
        } else {
          scrollContainer.classList.remove("show-bottom-gradient");
        }
      };

      scrollList.addEventListener("scroll", onScroll);
      onScroll();

      return () => {
        scrollList.removeEventListener("scroll", onScroll);
      };
    }
  }, []);

  return (
    <section ref={containerRef} className={cn(cls.scroll, "scroll-container")}>
      <ul ref={listRef}>{children}</ul>
    </section>
  );
}
