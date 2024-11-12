import * as React from "react";

import { PollingStation } from "@kiesraad/api";
import { InputField } from "@kiesraad/ui";

export interface PollingStationFormProps {
  pollingStation?: PollingStation;
  onSaved?: () => void;
}

export type FormElements = {
  [key in keyof PollingStation]: HTMLInputElement;
} & HTMLFormControlsCollection;

interface Form extends HTMLFormElement {
  readonly elements: FormElements;
}

async function doSubmit() {
  //await sleep for 1s and log values
  await new Promise((resolve) => setTimeout(resolve, 1000));
}

export function PollingStationForm({ pollingStation, onSaved }: PollingStationFormProps) {
  const formRef = React.useRef<Form>(null);

  const handleSubmit = (event: React.FormEvent<Form>) => {
    void (async (event: React.FormEvent<Form>) => {
      event.preventDefault();
      const form = event.currentTarget;
      const elements = form.elements;
      console.error(elements);
      await doSubmit();

      onSaved?.();
    })(event);
  };
  return (
    <div>
      <h2>Algemene gegevens</h2>
      <form ref={formRef} onSubmit={handleSubmit}>
        <div className="form stack horizontal">
          <InputField name="number" label="Nummer" fieldWidth="narrow" value={pollingStation?.number} />

          <InputField name="name" label="Naam" value={pollingStation?.name} />
        </div>

        <div>
          <span>Soort Stembureau</span>
          <span>Radios</span>
        </div>

        <InputField
          name="number_of_voters"
          label="Aantal kiesgerechtigden"
          subtext="optioneel"
          value={pollingStation?.number_of_voters}
        />

        <h2>Adres van het stembureau</h2>

        <InputField name="street" label="Straat" value={pollingStation?.street} />

        <InputField name="postal_code" label="Postcode" value={pollingStation?.postal_code} />
        <InputField name="house_number" label="Huisnummer" value={pollingStation?.house_number} />
        <InputField name="locality" label="Plaats" value={pollingStation?.locality} />
      </form>
    </div>
  );
}
