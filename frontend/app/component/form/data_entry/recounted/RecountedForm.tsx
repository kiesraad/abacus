import { ErrorModal } from "app/component/error";

import { ApiError } from "@kiesraad/api";
import { t } from "@kiesraad/i18n";
import { BottomBar, Button, ChoiceList, Feedback, Form, KeyboardKey, KeyboardKeys } from "@kiesraad/ui";

import { DataEntryNavigation } from "../DataEntryNavigation";
import { useRecounted } from "./useRecounted";

export function RecountedForm() {
  const { error, recounted, formRef, setRecounted, formSection, isSaving, onSubmit } = useRecounted();

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
      <DataEntryNavigation onSubmit={onSubmit} currentValues={{ recounted }} />
      {error instanceof ApiError && <ErrorModal error={error} />}
      {formSection.isSaved && formSection.errors.length > 0 && (
        <Feedback id="feedback-error" type="error" data={formSection.errors.map((error) => error.code)} />
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
