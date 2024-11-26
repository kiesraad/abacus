import * as React from "react";

import { useRecounted } from "@kiesraad/api";
import { t } from "@kiesraad/i18n";
import { BottomBar, Button, ChoiceList, Feedback, Form, KeyboardKey, KeyboardKeys } from "@kiesraad/ui";

interface FormElements extends HTMLFormControlsCollection {
  yes: HTMLInputElement;
  no: HTMLInputElement;
}

interface RecountedFormElement extends HTMLFormElement {
  readonly elements: FormElements;
}

export function RecountedForm() {
  const formRef = React.useRef<RecountedFormElement>(null);

  const getValues = React.useCallback(() => {
    const form = formRef.current;
    if (!form) {
      return { recounted: undefined };
    }
    const elements = form.elements;
    return { recounted: elements.yes.checked ? true : elements.no.checked ? false : undefined };
  }, []);

  const { status, sectionValues, errors, isSaved, submit } = useRecounted(getValues);

  const handleSubmit = (event: React.FormEvent<RecountedFormElement>) =>
    void (async (event: React.FormEvent<RecountedFormElement>) => {
      event.preventDefault();

      await submit();
    })(event);

  React.useEffect(() => {
    if (isSaved) {
      window.scrollTo(0, 0);
    }
  }, [isSaved, errors]);

  const hasValidationError = errors.length > 0;

  return (
    <Form onSubmit={handleSubmit} ref={formRef} id="recounted_form" title={t("recounted.recounted_form_title")}>
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
            defaultChecked={sectionValues.recounted === true}
            label={t("recounted.recounted_yes")}
          />
          <ChoiceList.Radio
            id="no"
            value="no"
            name="recounted"
            defaultChecked={sectionValues.recounted === false}
            label={t("recounted.recounted_no")}
          />
        </ChoiceList>
      </div>
      <BottomBar type="form">
        <BottomBar.Row>
          <Button type="submit" size="lg" disabled={status.current === "saving"}>
            {t("next")}
          </Button>
          <KeyboardKeys keys={[KeyboardKey.Shift, KeyboardKey.Enter]} />
        </BottomBar.Row>
      </BottomBar>
    </Form>
  );
}
