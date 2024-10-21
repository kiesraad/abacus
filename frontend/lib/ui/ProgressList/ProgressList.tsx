import * as React from "react";

import { MenuStatus, renderStatusIcon } from "@kiesraad/ui";
import { cn } from "@kiesraad/util";

import cls from "./ProgressList.module.css";
import { ProgressListScroll } from "./ProgressListScroll";

export interface ProgressListProps {
  children?: React.ReactNode;
}

export function ProgressList({ children }: ProgressListProps) {
  return <div className={cls["progress-list"]}>{children}</div>;
}

ProgressList.Fixed = ({ children }: { children: React.ReactNode }) => (
  <section className="fixed">
    <ul className="fixed">{children}</ul>
  </section>
);
ProgressList.Scroll = ProgressListScroll;

ProgressList.Ruler = () => <li className="ruler">&nbsp;</li>;

// active is not a status since we might want to show both concurrently.
export type ProgressListItemProps = {
  status: MenuStatus;
  active?: boolean;
  disabled?: boolean;
  children?: React.ReactNode;
  id?: string;
  scrollIntoView?: boolean;
};

ProgressList.Item = function ProgressListItem({
  active,
  status,
  disabled,
  children,
  id,
  scrollIntoView,
}: ProgressListItemProps) {
  const icon = renderStatusIcon(active ? "active" : status);
  const ref = React.useRef<HTMLLIElement>(null);

  React.useEffect(() => {
    if (scrollIntoView && active) {
      const li = ref.current;
      li?.scrollIntoView({ behavior: "smooth", block: "nearest" });

      // scrollIntoView scrolls the root container as well when using block: "start"
      // const ul = ref.current?.parentElement;
      // if (!li || !ul) return;

      // ul.scrollTo({
      //   top: li.offsetTop - 10,
      //   behavior: "smooth",
      // });
    }
  }, [scrollIntoView, active]);
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
