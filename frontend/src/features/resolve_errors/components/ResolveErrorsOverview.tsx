import { Link } from "react-router";

import { StatusList } from "@/components/ui/StatusList/StatusList";
import { t } from "@/i18n/translate";
import { ValidationResult, ValidationResults } from "@/types/generated/openapi";
import { DataEntrySection } from "@/types/types";
import { dottedCode, getValidationResultSetForSection } from "@/utils/ValidationResults";

interface ResolveErrorsOverviewProps {
  structure: DataEntrySection[];
  results: ValidationResults;
}

export function ResolveErrorsOverview({ structure, results }: ResolveErrorsOverviewProps) {
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
            <Link to={`./${section.id}`}>{section.title}</Link>
          </StatusList.Title>
          <StatusList id={`overview-${section.id}`} gap="sm">
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
  return (
    <StatusList.Item status={status}>
      <div className="bold">
        {dottedCode(code)} {t(`feedback.${code}.coordinator.title`, { ...context })}
      </div>
      <div>
        <strong>→</strong>{" "}
        <span className="font-italic">{t(`feedback.${code}.coordinator.title`, { ...context })}</span>
      </div>
    </StatusList.Item>
  );
}
