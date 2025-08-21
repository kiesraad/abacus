import * as React from "react";

import cls from "./Badge.module.css";

export function SectionNumber({ children }: React.PropsWithChildren) {
  return <span className={cls.data_entry_section}>{children}</span>;
}
