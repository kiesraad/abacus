import * as React from "react";

import { ApiError } from "@/api/ApiResult";
import { ErrorModal } from "@/components/error/ErrorModal";
import { Alert } from "@/components/ui/Alert/Alert";
import { BottomBar } from "@/components/ui/BottomBar/BottomBar";
import { Button } from "@/components/ui/Button/Button";
import { Checkbox } from "@/components/ui/CheckboxAndRadio/CheckboxAndRadio";
import { Feedback } from "@/components/ui/Feedback/Feedback";
import { Form } from "@/components/ui/Form/Form";
import { KeyboardKeys } from "@/components/ui/KeyboardKeys/KeyboardKeys";
import { t } from "@/i18n/translate";
import { FormSectionId } from "@/types/types";
import { KeyboardKey } from "@/types/ui";

import { useDataEntryFormSection } from "../hooks/useDataEntryFormSection";
import { DataEntryNavigation } from "./DataEntryNavigation";
import { DataEntrySubsections } from "./DataEntrySubsections";

export function DataEntrySection({ sectionId }: { sectionId: FormSectionId }) {
  const {
    error,
    formRef,
    onSubmit,
    currentValues,
    setValues,
    dataEntryStructure,
    formSection,
    status,
    setAcceptErrorsAndWarnings,
    defaultProps,
    showAcceptErrorsAndWarnings,
  } = useDataEntryFormSection({ section: sectionId });
  const section = dataEntryStructure.find((s) => s.id === sectionId);

  if (!section) {
    throw new Error(`Section with id ${sectionId} not found`);
  }

  const formId = sectionId + "_form";

  const bottomBarType = section.subsections.some((subsection) => subsection.type === "inputGrid")
    ? "inputGrid"
    : "form";
  const keyboardHintText = section.id.startsWith("political_group_votes_") ? t("candidates_votes.goto_totals") : null;

  // Missing totals error for political group votes form
  let totalFieldId = null;
  if (sectionId.startsWith("political_group_votes_")) {
    const path = Object.keys(currentValues).find((key) => key.endsWith(".total"));
    if (path) {
      totalFieldId = `data.${path}`;
    }
  }

  const [missingTotalError, setMissingTotalError] = React.useState(false);

  React.useEffect(() => {
    if (missingTotalError && totalFieldId) {
      document.getElementById(totalFieldId)?.focus();
    }
  }, [missingTotalError, totalFieldId]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // if currentValues contains votes on candidates but the total is left empty, trigger the missingTotalError
    if (totalFieldId) {
      const isMissingTotal =
        Object.entries(currentValues).some(([key, value]) => key.endsWith(".votes") && value !== "") &&
        Object.entries(currentValues).some(([key, value]) => key.endsWith(".total") && value === "");
      setMissingTotalError(isMissingTotal);
      if (isMissingTotal) {
        return false;
      }
    }

    void onSubmit();
  };

  return (
    <Form onSubmit={handleSubmit} ref={formRef} id={formId} title={section.title}>
      <DataEntryNavigation onSubmit={onSubmit} currentValues={currentValues} />
      {error instanceof ApiError && <ErrorModal error={error} />}
      {formSection.isSaved && !formSection.errors.isEmpty() && (
        <Feedback id="feedback-error" type="error" data={formSection.errors.getCodes()} />
      )}
      {formSection.isSaved && !formSection.warnings.isEmpty() && (
        <Feedback id="feedback-warning" type="warning" data={formSection.warnings.getCodes()} />
      )}

      <DataEntrySubsections
        section={section}
        currentValues={currentValues}
        setValues={setValues}
        defaultProps={defaultProps}
        missingTotalError={missingTotalError}
      />

      {missingTotalError && (
        <div id="missing-total-error">
          <Alert type="error" small>
            <p>{t("candidates_votes.check_totals")}</p>
          </Alert>
        </div>
      )}

      <BottomBar type={bottomBarType}>
        {formSection.acceptErrorsAndWarningsError && (
          <BottomBar.Row>
            <Alert type="error" small>
              <p>{t("data_entry.continue_after_check")}</p>
            </Alert>
          </BottomBar.Row>
        )}
        {showAcceptErrorsAndWarnings && (
          <BottomBar.Row>
            <Checkbox
              id={"acceptWarningsCheckbox"}
              checked={formSection.acceptErrorsAndWarnings}
              hasError={formSection.acceptErrorsAndWarningsError}
              onChange={(e) => {
                setAcceptErrorsAndWarnings(e.target.checked);
              }}
              label={t("data_entry.form_accept_warnings")}
            />
          </BottomBar.Row>
        )}
        {keyboardHintText && (
          <BottomBar.Row>
            <KeyboardKeys.HintText>
              <KeyboardKeys keys={[KeyboardKey.Shift, KeyboardKey.Down]} />
              {keyboardHintText}
            </KeyboardKeys.HintText>
          </BottomBar.Row>
        )}
        <BottomBar.Row>
          <Button type="submit" size="lg" disabled={status === "saving"}>
            {t("next")}
          </Button>
          <KeyboardKeys keys={[KeyboardKey.Shift, KeyboardKey.Enter]} />
        </BottomBar.Row>
      </BottomBar>
    </Form>
  );
}
