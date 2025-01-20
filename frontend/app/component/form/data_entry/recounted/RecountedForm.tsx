import { t } from "@kiesraad/i18n";
import { BottomBar, Button, ChoiceList, Feedback, Form, KeyboardKey, KeyboardKeys } from "@kiesraad/ui";

import { useRecounted } from "./useRecounted";
import { PollingStationFormNavigation } from "app/component/pollingstation/PollingStationFormNavigation";

export function RecountedForm() {
  const {
    status,
    recounted,
    formRef,
    pollingStationResults,
    setRecounted,
    errors,
    hasValidationError,
    isSaved,
    isSaving,
    onSubmit
  } = useRecounted();

  console.log(recounted, pollingStationResults, status)

  return (
    <Form
      onSubmit={(e) => {
        e.preventDefault();
        void onSubmit();
      }}
      ref={formRef}
      id="recounted_form"
      title={t("recounted.recounted_form_title")}
    >
      <PollingStationFormNavigation
        onSubmit={onSubmit}
        currentValues={{ recounted }}
        hasChanges={recounted !== pollingStationResults.recounted}
        acceptWarnings={false}
      />
      {isSaved && hasValidationError && (
        <Feedback id="feedback-error" type="error" data={errors.map((error) => error.code)} />
      )}
      <p className="form-paragraph md">{t("recounted.message")}</p>
      <div className="radio-form">
        <ChoiceList>
          <ChoiceList.Radio
            id="yes"
            value="yes"
            name="recounted"
            autoFocus
            checked={recounted === true}
            onChange={(e) => setRecounted(e.target.checked)}
            label={t("recounted.recounted_yes")}
          />
          <ChoiceList.Radio
            id="no"
            value="no"
            name="recounted"
            checked={recounted === false}
            onChange={(e) => setRecounted(!e.target.checked)}
            label={t("recounted.recounted_no")}
          />
        </ChoiceList>
      </div>
      <BottomBar type="form">
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
