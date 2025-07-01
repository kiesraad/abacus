import { Link, useParams } from "react-router";

import { ProgressList } from "@/components/ui/ProgressList/ProgressList";
import { useNumericParam } from "@/hooks/useNumericParam";
import { t } from "@/i18n/translate";
import { ValidationResults } from "@/types/generated/openapi";
import { DataEntrySection } from "@/types/types";
import { MenuStatus } from "@/types/ui";
import { getValidationResultSetForSection } from "@/utils/ValidationResults";

interface ResolveErrorsNavigationProps {
  structure: DataEntrySection[];
  validationResults: ValidationResults;
}

export function ResolveErrorsNavigation({ structure, validationResults }: ResolveErrorsNavigationProps) {
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
    return `/elections/${electionId}/status/${pollingStationId}/resolve-errors/${sectionId}`;
  };

  return (
    <ProgressList>
      <ProgressList.Fixed>
        <ProgressList.Item status="idle" active={currentSectionId === null}>
          <Link to={getSectionUrl("")}>{t("resolve_errors.short_title")}</Link>
        </ProgressList.Item>
        {structure.map((section) => (
          <ProgressList.Item
            key={section.id}
            status={getSectionStatus(section.id)}
            addSpace={section.id === structure[0]?.id || section.id === "political_group_votes_1"}
            active={currentSectionId === section.id}
          >
            <Link to={getSectionUrl(section.id)}>
              <span>{section.short_title}</span>
            </Link>
          </ProgressList.Item>
        ))}
      </ProgressList.Fixed>
    </ProgressList>
  );
}
