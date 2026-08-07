import { Link } from "react-router";
import { ApiError, FatalApiError } from "@/api/ApiResult";
import { CommitteeSessionPausedModal } from "@/components/data_entry/CommitteeSessionPausedModal";
import { ErrorModal } from "@/components/error/ErrorModal";
import { StatusList } from "@/components/ui/StatusList/StatusList";
import { CheckAndSaveForm } from "@/features/data_entry/components/check_and_save/CheckAndSaveForm";
import { DataEntryNavigation } from "@/features/data_entry/components/DataEntryNavigation";
import { useDataEntryContext } from "@/features/data_entry/hooks/useDataEntryContext";
import type { FormSection, SubmitCurrentFormOptions } from "@/features/data_entry/types/types";
import { getUrlForFormSectionID } from "@/features/data_entry/utils/utils";
import { useElection } from "@/hooks/election/useElection";
import { t } from "@/i18n/translate";
import type { ValidationResult } from "@/types/generated/openapi";
import { getTranslations } from "@/utils/ValidationResults";

interface CorrectWarningSection {
  id: string;
  title: string;
  url: string;
  warning: { code: string; title: string };
}

/**
 * Rendered when some section has a correction warning.
 */
function CheckAndSaveCorrectWarnings({ sections }: { sections: CorrectWarningSection[] }) {
  return (
    <>
      <legend>
        <h2>{t("check_and_save.title")}</h2>
      </legend>
      <p className="md">{t("check_and_save.correction_warnings")}</p>
      <StatusList.Wrapper>
        {sections.map((section) => (
          <StatusList.Section key={section.id} aria-labelledby={`${section.id}_title`}>
            <StatusList.Title id={`${section.id}_title`}>
              <Link to={section.url}>{section.title}</Link>
            </StatusList.Title>
            <StatusList id={`save-form-summary-list-${section.id}`} gap="sm">
              <StatusList.Item key={section.warning.code} status="warning">
                <strong>{section.warning.code}</strong>&nbsp;{section.warning.title}
              </StatusList.Item>
            </StatusList>
          </StatusList.Section>
        ))}
      </StatusList.Wrapper>
    </>
  );
}

/** Returns if section has a correctionWarning, and let TypeScript know */
function hasCorrectionWarning(section: FormSection): section is FormSection & { correctionWarning: ValidationResult } {
  return section.correctionWarning !== undefined;
}

export function CheckAndSaveSection() {
  const { election } = useElection();
  const { error, dataEntryStructure, formState, onSubmitForm, dataEntryId, entryNumber } = useDataEntryContext();

  // save the current state, without finalising (for the abort dialog)
  const onSubmit = async (options?: SubmitCurrentFormOptions) => {
    return await onSubmitForm("save", {}, options);
  };

  const correctWarningSections = Object.values(formState.sections)
    .filter(hasCorrectionWarning)
    .map((section) => ({
      id: section.id,
      title: dataEntryStructure.find((s) => s.id === section.id)?.title || section.id,
      url: getUrlForFormSectionID(election.id, dataEntryId, entryNumber, section.id),
      warning: getTranslations(election, section.correctionWarning, "typist"),
    }));

  return (
    <>
      <DataEntryNavigation onSubmit={onSubmit} />

      {error instanceof FatalApiError && error.reference === "CommitteeSessionPaused" && (
        <CommitteeSessionPausedModal showUnsavedChanges committeeCategory={election.committee_category} />
      )}
      {error instanceof ApiError && <ErrorModal error={error} />}

      {correctWarningSections.length > 0 ? (
        <CheckAndSaveCorrectWarnings sections={correctWarningSections} />
      ) : (
        <CheckAndSaveForm />
      )}
    </>
  );
}
