import { Link, useParams } from "react-router";

import { ProgressList } from "@/components/ui/ProgressList/ProgressList";
import { showIndexPage } from "@/features/data_entry_detail/utils/validationResults";
import { useNumericParam } from "@/hooks/useNumericParam";
import { t } from "@/i18n/translate";
import type { DataEntryStatusName, ValidationResults } from "@/types/generated/openapi";
import type { DataEntrySection } from "@/types/types";
import type { MenuStatus } from "@/types/ui";
import { getValidationResultSetForSection } from "@/utils/ValidationResults";

interface DetailNavigationProps {
  structure: DataEntrySection[];
  status: DataEntryStatusName;
  validationResults: ValidationResults;
}

export function DetailNavigation({ structure, status, validationResults }: DetailNavigationProps) {
  const pollingStationId = useNumericParam("pollingStationId");
  const electionId = useNumericParam("electionId");
  const params = useParams<{ sectionId?: string }>();
  const currentSectionId = params.sectionId ?? null;

  const getSectionStatus = (sectionId: string): MenuStatus => {
    const section = structure.find((s) => s.id === sectionId);

    if (!section) {
      throw new Error(`Section with id ${sectionId} not found`);
    }

    const sectionErrors = getValidationResultSetForSection(validationResults.errors, section);
    const sectionWarnings = getValidationResultSetForSection(validationResults.warnings, section);

    if (!sectionErrors.isEmpty()) {
      return "error";
    }
    if (!sectionWarnings.isEmpty()) {
      return "warning";
    }

    return "idle";
  };

  const getSectionUrl = (sectionId: string): string => {
    const basePath = `/elections/${electionId}/status/${pollingStationId}/detail`;
    return sectionId ? `${basePath}/${sectionId}` : basePath;
  };

  // Separate sections into fixed and scrollable groups
  const fixedSections = structure.filter((section) => !section.id.startsWith("political_group_votes_"));
  const politicalGroupSections = structure.filter((section) => section.id.startsWith("political_group_votes_"));
  return (
    <ProgressList>
      <ProgressList.Fixed>
        {showIndexPage(validationResults) && (
          <ProgressList.Item status="idle" active={currentSectionId === null}>
            <Link to={getSectionUrl("")}>
              {t(
                `data_entry_detail.${status === "first_entry_has_errors" ? "resolve_errors.short_title" : "read_only.short_title"}`,
              )}
            </Link>
          </ProgressList.Item>
        )}

        {fixedSections.map((section) => (
          <ProgressList.Item
            key={section.id}
            status={getSectionStatus(section.id)}
            addSpace={section.id === structure[0]?.id}
            active={currentSectionId === section.id}
          >
            <Link to={getSectionUrl(section.id)}>
              <span>{section.short_title}</span>
            </Link>
          </ProgressList.Item>
        ))}
      </ProgressList.Fixed>

      <ProgressList.Scroll>
        {politicalGroupSections.map((section) => (
          <ProgressList.Item
            key={section.id}
            status={getSectionStatus(section.id)}
            addSpace={section.id === "political_group_votes_1"}
            active={currentSectionId === section.id}
          >
            <Link to={getSectionUrl(section.id)}>
              <span>{section.short_title}</span>
            </Link>
          </ProgressList.Item>
        ))}
      </ProgressList.Scroll>
    </ProgressList>
  );
}
