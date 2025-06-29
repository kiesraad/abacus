import { DataEntrySubsections } from "@/components/data_entry/DataEntrySubsections";
import { Feedback } from "@/components/ui/Feedback/Feedback";
import { Form } from "@/components/ui/Form/Form";
import { PollingStationResults, ValidationResults } from "@/types/generated/openapi";
import { DataEntrySection, SectionValues } from "@/types/types";
import { mapResultsToSectionValues } from "@/utils/dataEntryMapping";
import { getValidationResultSetForSection, mapValidationResultSetsToFields } from "@/utils/ValidationResults";

interface ReadOnlyDataEntrySectionProps {
  section: DataEntrySection;
  data: PollingStationResults;
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
    <Form id={section.id} title={section.title}>
      {!errors.isEmpty() && (
        <Feedback id="feedback-error" type="error" data={errors.getCodes()} userRole={userRole} shouldFocus={false} />
      )}
      {!warnings.isEmpty() && (
        <Feedback
          id="feedback-warning"
          type="warning"
          data={warnings.getCodes()}
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
    </Form>
  );
}
