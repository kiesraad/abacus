import { ApiError } from "@/api/ApiResult";
import { ErrorModal } from "@/components/error/ErrorModal";
import { Alert } from "@/components/ui/Alert/Alert";
import { BottomBar } from "@/components/ui/BottomBar/BottomBar";
import { Button } from "@/components/ui/Button/Button";
import { Checkbox } from "@/components/ui/CheckboxAndRadio/CheckboxAndRadio";
import { ChoiceList } from "@/components/ui/CheckboxAndRadio/ChoiceList";
import { Feedback } from "@/components/ui/Feedback/Feedback";
import { Form } from "@/components/ui/Form/Form";
import { KeyboardKeys } from "@/components/ui/KeyboardKeys/KeyboardKeys";
import { useUserRole } from "@/hooks/user/useUserRole";
import { t } from "@/i18n/translate";
import { KeyboardKey } from "@/types/ui";

import { DataEntryNavigation } from "../DataEntryNavigation";
import { useRecounted } from "./useRecounted";

export function RecountedForm() {
  const { isTypist } = useUserRole();
  const {
    error,
    recounted,
    formRef,
    setRecounted,
    formSection,
    isSaving,
    onSubmit,
    setAcceptErrorsAndWarnings,
    defaultProps,
    showAcceptErrorsAndWarnings,
  } = useRecounted();

  return (
    <Form
      onSubmit={(e) => {
        e.preventDefault();
        void onSubmit();
      }}
      ref={formRef}
      id="recounted_form"
      title={t("recounted.form_title")}
    >
      <DataEntryNavigation onSubmit={onSubmit} currentValues={{ recounted }} />
      {error instanceof ApiError && <ErrorModal error={error} />}
      {formSection.isSaved && !formSection.errors.isEmpty() && (
        <Feedback id="feedback-error" type="error" data={formSection.errors.getCodes()} isTypist={isTypist} />
      )}
      {formSection.isSaved && !formSection.warnings.isEmpty() && formSection.errors.isEmpty() && (
        <Feedback id="feedback-warning" type="warning" data={formSection.warnings.getCodes()} isTypist={isTypist} />
      )}
      <p className="form-paragraph md">{t("recounted.message")}</p>
      <div className="radio-form">
        <ChoiceList>
          {defaultProps.errorsAndWarnings?.get("data.recounted") && (
            <ChoiceList.Error id="recounted-error">{t("recounted.error")}</ChoiceList.Error>
          )}
          <ChoiceList.Radio
            id="yes"
            value="yes"
            name="recounted"
            autoFocus
            checked={recounted === true}
            onChange={(e) => {
              setRecounted(e.target.checked);
            }}
            label={t("recounted.recounted_yes")}
          />
          <ChoiceList.Radio
            id="no"
            value="no"
            name="recounted"
            checked={recounted === false}
            onChange={(e) => {
              setRecounted(!e.target.checked);
            }}
            label={t("recounted.recounted_no")}
          />
        </ChoiceList>
      </div>
      <BottomBar type="form">
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
              id="recounted_form_accept_warnings"
              checked={formSection.acceptErrorsAndWarnings}
              hasError={formSection.acceptErrorsAndWarningsError}
              onChange={(e) => {
                setAcceptErrorsAndWarnings(e.target.checked);
              }}
              label={t("data_entry.form_accept_warnings")}
            />
          </BottomBar.Row>
        )}
        <BottomBar.Row>
          <Button type="submit" size="lg" disabled={isSaving}>
            {t("next")}
          </Button>
          <KeyboardKeys keys={[KeyboardKey.Shift, KeyboardKey.Enter]} />
        </BottomBar.Row>
      </BottomBar>
    </Form>
  );
}
