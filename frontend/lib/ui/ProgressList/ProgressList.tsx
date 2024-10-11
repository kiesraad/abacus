import * as React from "react";

import { MenuStatus, renderStatusIcon } from "@kiesraad/ui";
import { cn } from "@kiesraad/util";

import cls from "./ProgressList.module.css";

export interface ProgressListProps {
  children?: React.ReactNode;
}

export function ProgressList({ children }: ProgressListProps) {
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const scrollContainer = ref.current?.querySelector("section.scroll-container");
    const scrollList = scrollContainer?.querySelector("ul");

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
    <div ref={ref} className={cls["progress-list"]}>
      {children}
    </div>
  );
}

ProgressList.Fixed = ({ children }: { children: React.ReactNode }) => (
  <section className="fixed">
    <ul className="fixed">{children}</ul>
  </section>
);
ProgressList.Scroll = ({ children }: { children: React.ReactNode }) => (
  <section className={cn(cls.scroll, "scroll-container")}>
    <ul>{children}</ul>
  </section>
);

ProgressList.Ruler = () => <li className="ruler">&nbsp;</li>;

// active is not a status since we might want to show both concurrently.
export type ProgressListItemProps = {
  status: MenuStatus;
  active?: boolean;
  disabled?: boolean;
  children?: React.ReactNode;
  id?: string;
};

ProgressList.Item = function ProgressListItem({ active, status, disabled, children, id }: ProgressListItemProps) {
  const icon = renderStatusIcon(active ? "active" : status);
  const ref = React.useRef<HTMLLIElement>(null);

  React.useEffect(() => {
    if (active) {
      ref.current?.scrollIntoView({
        behavior: "smooth",
      });
    }
  }, [active]);
  return (
    <li
      ref={ref}
      id={id}
      className={cn(active ? "active" : "idle", status, { disabled: !!disabled })}
      aria-current={active ? "step" : false}
    >
      <aside>{icon}</aside>
      <label>{children}</label>
    </li>
  );
};
