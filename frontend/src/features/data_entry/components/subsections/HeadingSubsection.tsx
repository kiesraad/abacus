import { t } from "@/i18n/translate";

import { HeadingSubsection } from "../../types/types";

export interface HeadingSubsectionProps {
  subsection: HeadingSubsection;
}

export function HeadingSubsectionComponent({ subsection }: HeadingSubsectionProps) {
  return <h2 className="mt-lg">{t(subsection.title)}</h2>;
}
