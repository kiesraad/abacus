import type { PropsWithChildren } from "react";

import cls from "./Badge.module.css";

export function SectionNumber({ children }: PropsWithChildren) {
  return <span className={cls.data_entry_section}>{children}</span>;
}
