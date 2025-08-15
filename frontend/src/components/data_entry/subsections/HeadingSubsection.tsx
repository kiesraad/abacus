import { HeadingSubsection } from "@/types/types";

export interface HeadingSubsectionProps {
  subsection: HeadingSubsection;
}

export function HeadingSubsectionComponent({ subsection }: HeadingSubsectionProps) {
  return <h3>{subsection.title}</h3>;
}
