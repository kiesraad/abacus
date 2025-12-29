import { Link } from "react-router";

import { StatusList } from "@/components/ui/StatusList/StatusList";
import { hasTranslation, t, tx } from "@/i18n/translate";
import { ValidationResult, ValidationResults } from "@/types/generated/openapi";
import { DataEntrySection } from "@/types/types";
import { dottedCode, getValidationResultSetForSection } from "@/utils/ValidationResults";

import cls from "./ErrorsAndWarningsOverview.module.css";

interface ErrorsAndWarningsOverviewProps {
  structure: DataEntrySection[];
  results: ValidationResults;
}

export function ErrorsAndWarningsOverview({ structure, results }: ErrorsAndWarningsOverviewProps) {
  const sections = structure
    .map((section) => {
      const errors = getValidationResultSetForSection(results.errors, section);
      const warnings = getValidationResultSetForSection(results.warnings, section);
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
              <OverviewItem key={validationResult.code} data={validationResult} status={"error"} />
            ))}
            {warnings.getAll().map((validationResult) => (
              <OverviewItem key={validationResult.code} data={validationResult} status={"warning"} />
            ))}
          </StatusList>
        </StatusList.Section>
      ))}
    </StatusList.Wrapper>
  );
}

function OverviewItem({ data: { code, context }, status }: { data: ValidationResult; status: "error" | "warning" }) {
  const title = t(`feedback.${code}.coordinator.title`, { ...context });
  const contentPath = `feedback.${code}.coordinator.content`;
  const actionsPath = `feedback.${code}.coordinator.actions`;
  const content = hasTranslation(contentPath) ? tx(contentPath, undefined, { ...context }) : undefined;
  const actions = hasTranslation(actionsPath) ? tx(actionsPath, undefined, { ...context }) : undefined;

  return (
    <StatusList.Item status={status}>
      <h4 className={cls.heading}>
        {dottedCode(code)} {title}
      </h4>
      {content && <div className="content">{content}</div>}
      {actions && <div className={cls.actions}>{actions}</div>}
    </StatusList.Item>
  );
}
