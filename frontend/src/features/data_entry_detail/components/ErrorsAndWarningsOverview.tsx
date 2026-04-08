import { Link } from "react-router";

import { StatusList } from "@/components/ui/StatusList/StatusList";
import type { Election, ValidationResult, ValidationResults } from "@/types/generated/openapi";
import type { DataEntrySection } from "@/types/types";
import { getTranslations, getValidationResultSetForSection } from "@/utils/ValidationResults";

import cls from "./ErrorsAndWarningsOverview.module.css";

interface ErrorsAndWarningsOverviewProps {
  structure: DataEntrySection[];
  election: Election;
  validationResults: ValidationResults;
}

export function ErrorsAndWarningsOverview({ structure, election, validationResults }: ErrorsAndWarningsOverviewProps) {
  const sections = structure
    .map((section) => {
      const errors = getValidationResultSetForSection(validationResults.errors, section);
      const warnings = getValidationResultSetForSection(validationResults.warnings, section);
      return { section, errors, warnings };
    })
    .filter(({ errors, warnings }) => !errors.isEmpty() || !warnings.isEmpty());

  return (
    <StatusList.Wrapper>
      {sections.map(({ section, errors, warnings }) => (
        <StatusList.Section key={section.id} aria-labelledby={`${section.id}_title`}>
          <StatusList.Title id={`${section.id}_title`}>
            <h3 className="mb-sm">
              <Link to={`./${section.id}`}>
                {section.short_title} {section.sectionNumber}
              </Link>
            </h3>
          </StatusList.Title>
          <StatusList id={`overview-${section.id}`} gap="md">
            {errors.getAll().map((validationResult) => (
              <OverviewItem
                key={validationResult.code}
                election={election}
                validationResult={validationResult}
                status={"error"}
              />
            ))}
            {warnings.getAll().map((validationResult) => (
              <OverviewItem
                key={validationResult.code}
                election={election}
                validationResult={validationResult}
                status={"warning"}
              />
            ))}
          </StatusList>
        </StatusList.Section>
      ))}
    </StatusList.Wrapper>
  );
}

interface OverviewItemProps {
  election: Election;
  validationResult: ValidationResult;
  status: "error" | "warning";
}
function OverviewItem({ election, validationResult, status }: OverviewItemProps) {
  const { code, title, content, actions } = getTranslations(election, validationResult, "coordinator");

  return (
    <StatusList.Item status={status}>
      <h4 className={cls.heading}>
        {code} {title}
      </h4>
      {content && <div className="content">{content}</div>}
      {actions && <div className={cls.actions}>{actions}</div>}
    </StatusList.Item>
  );
}
