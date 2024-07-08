import * as React from "react";
import { useNavigate } from "react-router-dom";

import { BottomBar, Button } from "@kiesraad/ui";

interface FormElements extends HTMLFormControlsCollection {
  yes: HTMLInputElement;
  no: HTMLInputElement;
}

interface RecountFormElement extends HTMLFormElement {
  readonly elements: FormElements;
}

export function RecountForm() {
  const navigate = useNavigate();
  const formRef = React.useRef<HTMLFormElement>(null);

  function handleSubmit(event: React.FormEvent<RecountFormElement>) {
    event.preventDefault();
    navigate("../numbers");
  }

  return (
    <form onSubmit={handleSubmit} ref={formRef}>
      <h2>Is er herteld?</h2>
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
