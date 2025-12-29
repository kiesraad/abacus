import { type ReactNode, useEffect, useRef } from "react";

import { cn } from "@/utils/classnames";

import cls from "./ProgressList.module.css";

export interface ProgressListScrollProps {
  children: ReactNode;
}

function throwMissingClass(): never {
  throw new Error(`A required CSS class is missing.`);
}

export function ProgressListScroll({ children }: ProgressListScrollProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const clsHasScrolling = cls.hasScrolling ?? throwMissingClass();
  const clsShowTopGradient = cls.showTopGradient ?? throwMissingClass();
  const clsShowBottomGradient = cls.showBottomGradient ?? throwMissingClass();
  const clsScroll = cls.scroll ?? throwMissingClass();

  useEffect(() => {
    const scrollContainer = containerRef.current;
    const scrollList = listRef.current;

    if (scrollContainer && scrollList) {
      const onScroll = () => {
        const scrollTop = scrollList.scrollTop;
        const scrollHeight = scrollList.scrollHeight;
        const clientHeight = scrollList.clientHeight;

        if (scrollHeight > clientHeight) {
          scrollContainer.classList.add(clsHasScrolling);
        }

        // Toggle top gradient visibility
        if (scrollTop > 0) {
          scrollContainer.classList.add(clsShowTopGradient);
        } else {
          scrollContainer.classList.remove(clsShowTopGradient);
        }

        // Toggle bottom gradient visibility
        if (scrollTop + clientHeight < scrollHeight) {
          scrollContainer.classList.add(clsShowBottomGradient);
        } else {
          scrollContainer.classList.remove(clsShowBottomGradient);
        }
      };

      scrollList.addEventListener("scroll", onScroll);

      onScroll();

      return () => {
        scrollList.removeEventListener("scroll", onScroll);
      };
    }
  }, [clsHasScrolling, clsShowTopGradient, clsShowBottomGradient]);

  return (
    <section ref={containerRef} className={cn(clsScroll, "scroll-container")}>
      <ul ref={listRef}>{children}</ul>
    </section>
  );
}
