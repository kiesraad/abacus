import * as React from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { BottomBar, Button, Feedback } from "@kiesraad/ui";

interface FormElements extends HTMLFormControlsCollection {
  yes: HTMLInputElement;
  no: HTMLInputElement;
}

interface RecountedFormElement extends HTMLFormElement {
  readonly elements: FormElements;
}

export function RecountedForm() {
  const navigate = useNavigate();
  const [hasValidationError, setHasValidationError] = useState(false);
  const formRef = React.useRef<HTMLFormElement>(null);

  function handleSubmit(event: React.FormEvent<RecountedFormElement>) {
    event.preventDefault();
    const elements = event.currentTarget.elements;

    if (!elements.yes.checked && !elements.no.checked) {
      setHasValidationError(true);
    } else {
      setHasValidationError(false);
      navigate("../numbers");
    }
  }

  return (
    <form onSubmit={handleSubmit} ref={formRef}>
      <h2>Is er herteld?</h2>
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
          <input type="radio" name="recounted" id="yes" value="yes" />
          Ja, er was een hertelling
        </label>
        <label>
          <input type="radio" name="recounted" id="no" value="no" />
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
