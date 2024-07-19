import * as React from "react";
import { useBlocker } from "react-router-dom";

import { Recounted, useRecounted } from "@kiesraad/api";
import { BottomBar, Button, Feedback } from "@kiesraad/ui";
import { usePreventFormEnterSubmit } from "@kiesraad/util";

interface FormElements extends HTMLFormControlsCollection {
  yes: HTMLInputElement;
  no: HTMLInputElement;
}

interface RecountedFormElement extends HTMLFormElement {
  readonly elements: FormElements;
}

export function RecountedForm() {
  const [hasValidationError, setHasValidationError] = React.useState(false);
  const formRef = React.useRef<HTMLFormElement>(null);
  usePreventFormEnterSubmit(formRef);

  const {
    sectionValues,
    setSectionValues,
    loading,
    errors,
    warnings,
    serverError,
    isCalled,
    setTemporaryCache,
  } = useRecounted();

  const getValues = React.useCallback((elements: RecountedFormElement["elements"]): Recounted => {
    return { yes: elements.yes.checked, no: elements.no.checked };
  }, []);

  useBlocker(() => {
    if (formRef.current && !isCalled) {
      const elements = formRef.current.elements as RecountedFormElement["elements"];
      const values = getValues(elements);
      setTemporaryCache({
        key: "recounted",
        data: values,
      });
    }
    return false;
  });

  function handleSubmit(event: React.FormEvent<RecountedFormElement>) {
    event.preventDefault();
    const elements = event.currentTarget.elements;
    setSectionValues(getValues(elements));

    if (!elements.yes.checked && !elements.no.checked) {
      setHasValidationError(true);
    } else {
      setHasValidationError(false);
    }
  }

  React.useEffect(() => {
    if (isCalled) {
      window.scrollTo(0, 0);
    }
  }, [isCalled]);

  if (errors.length > 0) {
    setHasValidationError(true);
  }
  const hasValidationWarning = warnings.length > 0;
  const success = isCalled && !hasValidationError && !hasValidationWarning && !loading;

  return (
    <form onSubmit={handleSubmit} ref={formRef}>
      {/* Temporary while not navigating through form sections */}
      {success && <div id="result">Success</div>}
      <h2>Is er herteld?</h2>
      {serverError && (
        <Feedback type="error" title="Error">
          <div id="feedback-server-error">
            <h2>Error</h2>
            <p id="result">{serverError.message}</p>
          </div>
        </Feedback>
      )}
      {hasValidationError && (
        <Feedback type="error" title="Controleer het papieren proces-verbaal">
          <div>
            Is op pagina 1 aangegeven dat er in opdracht van het Gemeentelijk Stembureau is herteld?
            <ul>
              <li>Controleer of rubriek 6 is ingevuld. Is dat zo? Kies hieronder 'ja'</li>
              <li>Wel een vinkje, maar rubriek 6 niet ingevuld? Overleg met de coördinator</li>
              <li>Geen vinkje? Kies dan 'nee'.</li>
            </ul>
          </div>
        </Feedback>
      )}
      <p className="form-paragraph md">
        Was er een onverklaard verschil tussen het aantal toegelaten kiezers en het aantal
        uitgebrachte stemmen? Is er op basis daarvan herteld door het gemeentelijk stembureau?
      </p>
      <div className="radio-form">
        <label>
          <input type="radio" name="recounted" id="yes" defaultChecked={sectionValues.yes} />
          Ja, er was een hertelling
        </label>
        <label>
          <input type="radio" name="recounted" id="no" defaultChecked={sectionValues.no} />
          Nee, er was geen hertelling
        </label>
      </div>
      <BottomBar type="form">
        <Button type="submit" size="lg">
          Volgende
        </Button>
        <span className="button_hint">SHIFT + Enter</span>
      </BottomBar>
    </form>
  );
}
