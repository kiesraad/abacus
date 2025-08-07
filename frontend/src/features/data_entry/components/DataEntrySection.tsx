import * as React from "react";

import { ApiError } from "@/api/ApiResult";
import { DataEntrySubsections } from "@/components/data_entry/DataEntrySubsections";
import { ErrorModal } from "@/components/error/ErrorModal";
import { Alert } from "@/components/ui/Alert/Alert";
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

export function DataEntrySection() {
  const user = useUser();
  const {
    error,
    formRef,
    onSubmit,
    currentValues,
    setValues,
    formSection,
    status,
    setAcceptErrorsAndWarnings,
    defaultProps,
    showAcceptErrorsAndWarnings,
    section,
  } = useDataEntryFormSection();
  const acceptCheckboxRef = React.useRef<HTMLInputElement>(null);

  const formId = section.id + "_form";

  const bottomBarType = section.subsections.some((subsection) => subsection.type === "inputGrid")
    ? "inputGrid"
    : "form";
  const keyboardHintText = section.id.startsWith("political_group_votes_") ? t("candidates_votes.goto_totals") : null;

  // Missing totals error for political group votes form
  const missingTotalError = formSection.errors.includes("F402");

  // Memoize getCodes() results to prevent unnecessary focus triggers in Feedback
  const memoizedErrorCodes = React.useMemo(
    () => formSection.errors.getCodes().filter((code) => code !== "F402"),
    [formSection.errors],
  );
  const memoizedWarningCodes = React.useMemo(() => formSection.warnings.getCodes(), [formSection.warnings]);

  // Scroll unaccepted warnings/errors checkbox into view when error for it is triggered
  React.useEffect(() => {
    if (formSection.acceptErrorsAndWarningsError) {
      acceptCheckboxRef.current?.focus();
      requestAnimationFrame(() => {
        acceptCheckboxRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    }
  }, [formSection.acceptErrorsAndWarningsError]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    void onSubmit();
  };

  if (!user) {
    return null;
  }

  return (
    <Form onSubmit={handleSubmit} ref={formRef} id={formId}>
      <legend className={cls.titleContainer}>
        <span className={cls.title}>{section.title}</span>
        {section.sectionNumber && <span className={cls.badge}>{section.sectionNumber}</span>}
      </legend>
      <DataEntryNavigation onSubmit={onSubmit} currentValues={currentValues} />
      {error instanceof ApiError && <ErrorModal error={error} />}
      {formSection.isSaved && memoizedErrorCodes.length > 0 && (
        <Feedback id="feedback-error" type="error" data={memoizedErrorCodes} userRole={user.role} shouldFocus={true} />
      )}
      {formSection.isSaved && !formSection.warnings.isEmpty() && (
        <Feedback
          id="feedback-warning"
          type="warning"
          data={memoizedWarningCodes}
          userRole={user.role}
          shouldFocus={formSection.errors.isEmpty()}
        />
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
            <p>
              {t(`feedback.F402.typist.title`)}. {t(`feedback.F402.typist.content`)}
            </p>
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
