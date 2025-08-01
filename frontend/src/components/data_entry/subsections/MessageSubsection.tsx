import { MessageSubsection } from "@/types/types";

import cls from "./MessageSubsection.module.css";

export interface MessageSubsectionProps {
  subsection: MessageSubsection;
}

export function MessageSubsectionComponent({ subsection }: MessageSubsectionProps) {
  return <p className={cls.message}>{subsection.message}</p>;
}
