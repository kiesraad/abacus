import * as React from "react";

import { useRecounted } from "@kiesraad/api";
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

      try {
        await submit();
      } catch (e) {
        console.error("Error saving data entry", e);
      }
    })(event);

  React.useEffect(() => {
    if (isSaved) {
      window.scrollTo(0, 0);
    }
  }, [isSaved, errors]);

  const hasValidationError = errors.length > 0;

  return (
    <Form onSubmit={handleSubmit} ref={formRef} id="recounted_form" title="Is er herteld?">
      {isSaved && hasValidationError && (
        <Feedback id="feedback-error" type="error" data={errors.map((error) => error.code)} />
      )}
      <p className="form-paragraph md">
        Was er een onverklaard verschil tussen het aantal toegelaten kiezers en het aantal uitgebrachte stemmen? Is er
        op basis daarvan herteld door het gemeentelijk stembureau?
      </p>
      <div className="radio-form">
        <ChoiceList>
          <ChoiceList.Radio
            id="yes"
            value="yes"
            name="recounted"
            defaultChecked={sectionValues.recounted === true}
            label="Ja, er was een hertelling"
          />
          <ChoiceList.Radio
            id="no"
            value="no"
            name="recounted"
            defaultChecked={sectionValues.recounted === false}
            label="Nee, er was geen hertelling"
          />
        </ChoiceList>
      </div>
      <BottomBar type="form">
        <BottomBar.Row>
          <Button type="submit" size="lg" disabled={status.current === "saving"}>
            Volgende
          </Button>
          <KeyboardKeys keys={[KeyboardKey.Shift, KeyboardKey.Enter]} />
        </BottomBar.Row>
      </BottomBar>
    </Form>
  );
}
