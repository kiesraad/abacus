import { ProgressList } from "@/components/ui/ProgressList/ProgressList";
import { t } from "@/lib/i18n";
import { PoliticalGroup, PollingStationResults } from "@/types/generated/openapi";

import { sections } from "../utils/dataEntry";
import { groupHasDifferences, sectionHasDifferences } from "../utils/differences";

interface ResolveDifferencesOverviewProps {
  first?: PollingStationResults;
  second?: PollingStationResults;
  politicalGroups?: PoliticalGroup[];
}

export function ResolveDifferencesOverview({ first, second, politicalGroups }: ResolveDifferencesOverviewProps) {
  if (!first || !second || !politicalGroups) return null;

  const sectionDifferences = sections.map((section) => ({
    key: section.id,
    label: t(`resolve_differences.section_short.${section.id}`),
    hasDifferences: sectionHasDifferences(section, first, second),
  }));

  const politicalGroupDifferences = politicalGroups.map((pg, i) => ({
    key: pg.number,
    label: `${t("list")} ${pg.number} - ${pg.name}`,
    hasDifferences: groupHasDifferences(pg, first.political_group_votes[i], second.political_group_votes[i]),
  }));

  return (
    <ProgressList>
      <ProgressList.Fixed>
        {sectionDifferences.map((item, i) => (
          <ProgressList.OverviewItem
            key={item.key}
            status={item.hasDifferences ? "warning" : "idle"}
            addSpace={i === sectionDifferences.length - 1}
          >
            <span>{item.label}</span>
          </ProgressList.OverviewItem>
        ))}
        {politicalGroupDifferences.map((item) => (
          <ProgressList.OverviewItem key={item.key} status={item.hasDifferences ? "warning" : "idle"}>
            <span>{item.label}</span>
          </ProgressList.OverviewItem>
        ))}
      </ProgressList.Fixed>
    </ProgressList>
  );
}
