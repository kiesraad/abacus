import { ProgressList } from "@/components/ui/ProgressList/ProgressList";
import type { DataEntryResults, DataEntryStructure } from "@/types/types";

import { sectionHasDifferences } from "../utils/differences";

interface ResolveDifferencesOverviewProps {
  first: DataEntryResults;
  second: DataEntryResults;
  structure: DataEntryStructure;
}

export function ResolveDifferencesOverview({ first, second, structure }: ResolveDifferencesOverviewProps) {
  const sectionDifferences = structure.map((section) => ({
    id: section.id,
    short_title: section.short_title,
    hasDifferences: sectionHasDifferences(section, first, second),
  }));

  return (
    <ProgressList>
      <ProgressList.Fixed>
        {sectionDifferences.map((section) => (
          <ProgressList.OverviewItem
            key={section.id}
            status={section.hasDifferences ? "warning" : "idle"}
            addSpace={section.id === "political_group_votes_1"}
          >
            <span>{section.short_title}</span>
          </ProgressList.OverviewItem>
        ))}
      </ProgressList.Fixed>
    </ProgressList>
  );
}
