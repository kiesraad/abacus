import * as React from "react";
import { Link, useNavigate, useParams } from "react-router";

import { ApiError, FatalApiError } from "@/api/ApiResult";
import { CommitteeSessionPausedModal } from "@/components/data_entry/CommitteeSessionPausedModal";
import { ErrorModal } from "@/components/error/ErrorModal";
import { Alert } from "@/components/ui/Alert/Alert";
import { BottomBar } from "@/components/ui/BottomBar/BottomBar";
import { Button } from "@/components/ui/Button/Button";
import { Checkbox } from "@/components/ui/CheckboxAndRadio/CheckboxAndRadio";
import { Form } from "@/components/ui/Form/Form";
import { KeyboardKeys } from "@/components/ui/KeyboardKeys/KeyboardKeys";
import { StatusList } from "@/components/ui/StatusList/StatusList";
import { useElection } from "@/hooks/election/useElection";
import { t, tx } from "@/i18n/translate";
import { FormSectionId } from "@/types/types";
import { KeyboardKey, MenuStatus } from "@/types/ui";
import { dottedCode } from "@/utils/ValidationResults";

import { useDataEntryContext } from "../../hooks/useDataEntryContext";
import { useFormKeyboardNavigation } from "../../hooks/useFormKeyboardNavigation";
import { SubmitCurrentFormOptions } from "../../types/types";
import { DataEntryFormSectionStatus } from "../../utils/dataEntryUtils";
import { getUrlForFormSectionID } from "../../utils/utils";
import { DataEntryNavigation } from "../DataEntryNavigation";

export function CheckAndSaveForm() {
  const formRef = useFormKeyboardNavigation();

  const navigate = useNavigate();
  const { election } = useElection();
  const [isConfirmed, setIsConfirmed] = React.useState(false);
  const [isConfirmedError, setIsConfirmedError] = React.useState<string | null>(null);
  const {
    error,
    dataEntryStructure,
    formState,
    onSubmitForm,
    status,
    onFinaliseDataEntry,
    pollingStationId,
    entryNumber,
  } = useDataEntryContext();
  const acceptCheckboxRef = React.useRef<HTMLInputElement>(null);

  const params = useParams<{ sectionId: FormSectionId }>();
  const sectionId = params.sectionId ?? null;

  if (sectionId !== "save") {
    throw new Error(`CheckAndSaveForm can only be used with sectionId "save", not "${sectionId}"`);
  }

  const getUrlForFormSection = React.useCallback(
    (id: FormSectionId) => {
      return getUrlForFormSectionID(election.id, pollingStationId, entryNumber, id);
    },
    [election, pollingStationId, entryNumber],
  );

  const [notableFormSections, hasWarnings, hasErrors, allFeedbackAccepted] = React.useMemo(() => {
    const sections = Object.values(formState.sections).filter(
      (section) => !section.errors.isEmpty() || !section.warnings.isEmpty(),
    );
    let hasErrors = false;
    let hasWarnings = false;
    let allFeedbackAccepted = true;
    for (const section of sections) {
      if (!section.errors.isEmpty()) {
        hasErrors = true;
        if (!section.acceptErrorsAndWarnings) {
          allFeedbackAccepted = false;
        }
      }
      if (!section.warnings.isEmpty()) {
        hasWarnings = true;
        if (!section.acceptErrorsAndWarnings) {
          allFeedbackAccepted = false;
        }
      }
    }
    return [sections, hasWarnings, hasErrors, allFeedbackAccepted];
  }, [formState]);

  // Scroll unaccepted warnings/errors checkbox into view when error for it is triggered
  React.useEffect(() => {
    if (isConfirmedError) {
      acceptCheckboxRef.current?.focus();
      requestAnimationFrame(() => {
        acceptCheckboxRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    }
  }, [isConfirmedError]);

  // save the current state, without finalising (for the abort dialog)
  const onSubmit = async (options?: SubmitCurrentFormOptions) => {
    return await onSubmitForm("save", {}, options);
  };

  // finalise the data entry and navigate away
  // this also includes stopping the data entry with errors, this is handled by the server.
  const onFinalise = async () => {
    if (!allFeedbackAccepted) {
      return false;
    }

    if (hasErrors) {
      if (!isConfirmed) {
        setIsConfirmedError(t("data_entry.continue_with_errors"));
        return false;
      } else {
        setIsConfirmedError(null);
      }
    }

    const dataEntryStatus = await onFinaliseDataEntry();
    if (dataEntryStatus !== undefined) {
      if (dataEntryStatus.status === "entries_different") {
        await navigate(`/elections/${election.id}/data-entry#data-entry-different`);
      } else if (dataEntryStatus.status === "first_entry_has_errors") {
        await navigate(`/elections/${election.id}/data-entry#data-entry-errors`);
      } else {
        await navigate(`/elections/${election.id}/data-entry#data-entry-${entryNumber}-saved`);
      }
      return true;
    }

    return false;
  };

  return (
    <Form
      onSubmit={(event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        void onFinalise();
      }}
      id="check_save_form"
      title={t("check_and_save.title")}
      ref={formRef}
      aria-disabled={(hasErrors || hasWarnings) && !allFeedbackAccepted}
    >
      <DataEntryNavigation onSubmit={onSubmit} />

      {error instanceof FatalApiError && error.reference === "CommitteeSessionPaused" && (
        <CommitteeSessionPausedModal showUnsavedChanges />
      )}
      {error instanceof ApiError && <ErrorModal error={error} />}

      {hasErrors && allFeedbackAccepted ? (
        <>
          <p className="md">{t("check_and_save.accepted_errors")}</p>
          <StatusList.Wrapper>
            {notableFormSections.map((section) => {
              const title = dataEntryStructure.find((s) => s.id === section.id)?.title || section.id;
              return (
                <StatusList.Section key={section.id} aria-labelledby={`${section.id}_title`}>
                  <StatusList.Title id={`${section.id}_title`}>
                    <Link to={getUrlForFormSection(section.id)}>{title}</Link>
                  </StatusList.Title>
                  <StatusList id={`save-form-summary-list-${section.id}`} gap="sm">
                    {section.errors.getAll().map(({ code, context }) => {
                      return (
                        <StatusList.Item key={code} status="error" id={`section-error-${section.id}-${code}`}>
                          <strong>{dottedCode(code)}</strong>
                          &nbsp;
                          {tx(`feedback.${code}.typist.title`, undefined, context)}
                        </StatusList.Item>
                      );
                    })}
                    {section.warnings.getAll().map(({ code, context }) => {
                      return (
                        <StatusList.Item key={code} status="warning" id={`section-error-${section.id}-${code}`}>
                          <strong>{dottedCode(code)}</strong>
                          &nbsp;
                          {tx(`feedback.${code}.typist.title`, undefined, context)}
                        </StatusList.Item>
                      );
                    })}
                  </StatusList>
                </StatusList.Section>
              );
            })}
          </StatusList.Wrapper>
        </>
      ) : (
        <>
          <div id="save-form-summary-text">
            {!hasErrors && allFeedbackAccepted && <p className="md">{t("check_and_save.counts_add_up.no_warnings")}</p>}
            {!hasErrors && hasWarnings && !allFeedbackAccepted && (
              <>
                <p className="md">{t("check_and_save.counts_add_up.warnings")}</p>
                <p className="md">{t("check_and_save.check_warnings")}</p>
              </>
            )}
            {hasErrors && !allFeedbackAccepted && (
              <>
                <p className="md">{t("check_and_save.counts_do_not_add_up")}</p>
                <p className="md">{t("check_and_save.fix_the_errors")}</p>
              </>
            )}
          </div>
          <StatusList id="save-form-summary-list">
            {!hasErrors && <StatusList.Item status="accept">{t("check_and_save.counts_add_up_title")}</StatusList.Item>}

            {notableFormSections.map((section) => {
              const link = (title: React.ReactElement) => <Link to={getUrlForFormSection(section.id)}>{title}</Link>;
              const title = dataEntryStructure.find((s) => s.id === section.id)?.title || section.id;
              let status: DataEntryFormSectionStatus;
              if (!section.errors.isEmpty()) {
                status = "errors";
              } else {
                status = !section.warnings.isEmpty()
                  ? section.acceptErrorsAndWarnings
                    ? "accepted-warnings"
                    : "unaccepted-warnings"
                  : "empty";
              }

              const content = tx(
                `check_and_save.notable_form_sections.${status}`,
                { link },
                { link_title: title || "" },
              );

              return (
                <StatusList.Item
                  key={section.id}
                  status={menuStatusForFormSectionStatus(status)}
                  id={`section-status-${section.id}`}
                >
                  {content}
                </StatusList.Item>
              );
            })}

            {!hasErrors && !hasWarnings && (
              <StatusList.Item status="accept" id="no-blocking-errors-or-warnings">
                {t("check_and_save.no_warnings")}
              </StatusList.Item>
            )}
            {!allFeedbackAccepted ? (
              <StatusList.Item status={hasErrors ? "error" : "warning"} id="form-cannot-be-saved" className="bold">
                {t("check_and_save.can_not_save")}
              </StatusList.Item>
            ) : (
              <StatusList.Item status="accept" id="form-can-be-saved" className="bold">
                {t("check_and_save.can_save")}
              </StatusList.Item>
            )}
          </StatusList>

          {!hasErrors && allFeedbackAccepted && (
            <BottomBar type="form">
              <BottomBar.Row>
                <Button type="submit" disabled={status === "finalising"}>
                  {t("save")}
                </Button>
                <KeyboardKeys keys={[KeyboardKey.Shift, KeyboardKey.Enter]} />
              </BottomBar.Row>
            </BottomBar>
          )}
        </>
      )}

      {hasErrors && allFeedbackAccepted && (
        <BottomBar type="form">
          {isConfirmedError !== null && (
            <BottomBar.Row>
              <Alert type="error" small>
                <p>{isConfirmedError}</p>
              </Alert>
            </BottomBar.Row>
          )}
          <BottomBar.Row>
            <Checkbox
              id="check_and_save_form_errors_confirmed"
              ref={acceptCheckboxRef}
              checked={isConfirmed}
              hasError={!!isConfirmedError}
              onChange={(e) => {
                setIsConfirmed(e.target.checked);
              }}
              label={t("data_entry.form_accept_errors")}
            />
          </BottomBar.Row>
          <BottomBar.Row>
            <Button type="submit" disabled={status === "finalising"}>
              {t("complete")}
            </Button>
            <KeyboardKeys keys={[KeyboardKey.Shift, KeyboardKey.Enter]} />
          </BottomBar.Row>
        </BottomBar>
      )}
    </Form>
  );
}

function menuStatusForFormSectionStatus(status: DataEntryFormSectionStatus): MenuStatus {
  switch (status) {
    case "empty":
      return "empty";
    case "unaccepted-warnings":
      return "warning";
    case "accepted-warnings":
      return "accept";
    case "errors":
      return "error";
  }
}
