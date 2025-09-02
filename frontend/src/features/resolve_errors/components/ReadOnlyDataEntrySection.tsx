import { DataEntrySubsections } from "@/components/data_entry/DataEntrySubsections";
import { SectionNumber } from "@/components/ui/Badge/SectionNumber";
import { Feedback } from "@/components/ui/Feedback/Feedback";
import { Form } from "@/components/ui/Form/Form";
import { ValidationResults } from "@/types/generated/openapi";
import { DataEntryResults, DataEntrySection, SectionValues } from "@/types/types";
import { mapResultsToSectionValues } from "@/utils/dataEntryMapping";
import { getValidationResultSetForSection, mapValidationResultSetsToFields } from "@/utils/ValidationResults";

import cls from "./ReadOnlyDataEntrySection.module.css";

interface ReadOnlyDataEntrySectionProps {
  section: DataEntrySection;
  data: DataEntryResults;
  validationResults: ValidationResults;
}

export function ReadOnlyDataEntrySection({
  section,
  data: pollingStationResults,
  validationResults,
}: ReadOnlyDataEntrySectionProps) {
  const userRole = "coordinator";

  // Create validation result sets from the validation results
  const errors = getValidationResultSetForSection(validationResults.errors, section);
  const warnings = getValidationResultSetForSection(validationResults.warnings, section);

  // Map polling station results to section values for display
  const sectionValues: SectionValues = mapResultsToSectionValues(section, pollingStationResults);

  // Create default props for DataEntrySubsections
  const defaultProps = {
    errorsAndWarnings: mapValidationResultSetsToFields(errors, warnings),
    errorsAndWarningsAccepted: false,
  };

  // No-op setter for read-only mode
  const setValues = () => {};

  return (
    <Form id={section.id}>
      <legend className={cls.titleContainer}>
        <h2>
          {section.title} {section.sectionNumber && <SectionNumber>{section.sectionNumber}</SectionNumber>}
        </h2>
      </legend>
      <div className={cls.formContainer}>
        {!errors.isEmpty() && (
          <Feedback id="feedback-error" type="error" data={errors.getAll()} userRole={userRole} shouldFocus={false} />
        )}
        {!warnings.isEmpty() && (
          <Feedback
            id="feedback-warning"
            type="warning"
            data={warnings.getAll()}
            userRole={userRole}
            shouldFocus={false}
          />
        )}

        <DataEntrySubsections
          section={section}
          currentValues={sectionValues}
          setValues={setValues}
          defaultProps={defaultProps}
          missingTotalError={false}
          readOnly={true}
        />
      </div>
    </Form>
  );
}
