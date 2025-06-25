import { t } from "@/i18n/translate";
import { MessageSubsection } from "@/types/types";

export interface MessageSubsectionProps {
  subsection: MessageSubsection;
}

export function MessageSubsectionComponent({ subsection }: MessageSubsectionProps) {
  return <p className={subsection.className}>{t(subsection.message)}</p>;
}
