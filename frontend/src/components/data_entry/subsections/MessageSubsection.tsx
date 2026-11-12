import { Alert } from "@/components/ui/Alert/Alert";
import type { MessageSubsection } from "@/types/types";

import cls from "./MessageSubsection.module.css";

export interface MessageSubsectionProps {
  subsection: MessageSubsection;
}

export function MessageSubsectionComponent({ subsection }: MessageSubsectionProps) {
  if (subsection.variant === "notify") {
    return (
      <Alert type="notify" title={subsection.title} inline>
        <p>{subsection.message}</p>
      </Alert>
    );
  }

  return <p className={`${cls.message} ${subsection.variant ? cls[subsection.variant] : ""}`}>{subsection.message}</p>;
}
