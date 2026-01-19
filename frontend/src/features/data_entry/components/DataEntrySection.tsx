import { type FormEvent, useEffect, useMemo, useRef } from "react";

import { ApiError, FatalApiError } from "@/api/ApiResult";
import { CommitteeSessionPausedModal } from "@/components/data_entry/CommitteeSessionPausedModal";
import { DataEntrySubsections } from "@/components/data_entry/DataEntrySubsections";
import { ErrorModal } from "@/components/error/ErrorModal";
import { Alert } from "@/components/ui/Alert/Alert";
import { SectionNumber } from "@/components/ui/Badge/SectionNumber";
import { BottomBar } from "@/components/ui/BottomBar/BottomBar";
import { Button } from "@/components/ui/Button/Button";
import { Checkbox } from "@/components/ui/CheckboxAndRadio/CheckboxAndRadio";
import { Feedback } from "@/components/ui/Feedback/Feedback";
import { Form } from "@/components/ui/Form/Form";
import { KeyboardKeys } from "@/components/ui/KeyboardKeys/KeyboardKeys";
import { useUser } from "@/hooks/user/useUser";
import { t } from "@/i18n/translate";
import { KeyboardKey } from "@/types/ui";

import { useDataEntryFormSection } from "../hooks/useDataEntryFormSection";
import { DataEntryNavigation } from "./DataEntryNavigation";
import cls from "./DataEntrySection.module.css";

// biome-ignore lint/complexity/noExcessiveLinesPerFunction: TODO function should be refactored
export function DataEntrySection() {
  const user = useUser();
  const {
    error,
    formRef,
    onSubmit,
    previousValues,
    currentValues,
    setValues,
    formSection,
    status,
    setAcceptErrorsAndWarnings,
    defaultProps,
    showAcceptErrorsAndWarnings,
    section,
  } = useDataEntryFormSection();
  const acceptCheckboxRef = useRef<HTMLInputElement>(null);

  const formId = `${section.id}_form`;

  const lastSubsection = section.subsections[section.subsections.length - 1];
  const bottomBarType = lastSubsection?.type === "inputGrid" ? "inputGrid" : "form";

  const keyboardHintText = section.id.startsWith("political_group_votes_") ? t("candidates_votes.goto_totals") : null;

  // Missing totals error for political group votes form
  const missingTotalError = formSection.errors.includes("F401");

  // Memoize errors to prevent unnecessary focus triggers in Feedback
  const memoizedErrors = useMemo(
    () => formSection.errors.getAll().filter((result) => result.code !== "F401"),
    [formSection.errors],
  );
  const memoizedWarnings = useMemo(() => formSection.warnings.getAll(), [formSection.warnings]);

  // Scroll unaccepted warnings/errors checkbox into view when error for it is triggered
  useEffect(() => {
    if (formSection.acceptErrorsAndWarningsError) {
      acceptCheckboxRef.current?.focus();
      requestAnimationFrame(() => {
        acceptCheckboxRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    }
  }, [formSection]);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    void onSubmit();
  };

  if (!user) {
    return null;
  }

  return (
    <Form onSubmit={handleSubmit} ref={formRef} id={formId}>
      <legend className={cls.titleContainer}>
        <h2>
          {section.title} {section.sectionNumber && <SectionNumber>{section.sectionNumber}</SectionNumber>}
        </h2>
      </legend>
      <DataEntryNavigation onSubmit={onSubmit} currentValues={currentValues} />
      <div className={cls.formContainer}>
        {error instanceof FatalApiError && error.reference === "CommitteeSessionPaused" && (
          <CommitteeSessionPausedModal showUnsavedChanges />
        )}
        {error instanceof ApiError && <ErrorModal error={error} />}
        {formSection.isSaved && memoizedErrors.length > 0 && (
          <Feedback id="feedback-error" type="error" data={memoizedErrors} userRole={user.role} shouldFocus={true} />
        )}
        {formSection.isSaved && memoizedWarnings.length > 0 && (
          <Feedback
            id="feedback-warning"
            type="warning"
            data={memoizedWarnings}
            userRole={user.role}
            shouldFocus={formSection.errors.isEmpty()}
          />
        )}

        <DataEntrySubsections
          key={section.id}
          section={section}
          previousValues={previousValues}
          currentValues={currentValues}
          setValues={setValues}
          defaultProps={defaultProps}
          missingTotalError={missingTotalError}
        />

        {missingTotalError && (
          <div id="missing-total-error" className={cls.missingTotalError}>
            <Alert type="error" small>
              <p>{t(`feedback.F401.typist.title`)}</p>
            </Alert>
          </div>
        )}
      </div>
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
              ref={acceptCheckboxRef}
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
          <Button type="submit" disabled={status === "saving"}>
            {t("next")}
          </Button>
          <KeyboardKeys keys={[KeyboardKey.Shift, KeyboardKey.Enter]} />
        </BottomBar.Row>
      </BottomBar>
    </Form>
  );
}
