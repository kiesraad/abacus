import { MessageSubsection } from "@/types/types";

import cls from "./MessageSubsection.module.css";

export interface MessageSubsectionProps {
  subsection: MessageSubsection;
}

export function MessageSubsectionComponent({ subsection }: MessageSubsectionProps) {
  return <p className={[subsection.className, cls.message].join(" ")}>{subsection.message}</p>;
}
