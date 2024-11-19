import * as React from "react";

import { labelForPollingStationType, PollingStation, PollingStationType } from "@kiesraad/api";
import { Alert, Button, ChoiceList, Form, FormLayout, InputField } from "@kiesraad/ui";

import { usePollingStationCreate } from "./usePollingStationCreate";

export interface PollingStationFormProps {
  electionId: number;
  pollingStation?: PollingStation;
  onSaved?: (pollingStation: PollingStation) => void;
}

export type FormElements = {
  [key in keyof PollingStation]: HTMLInputElement;
} & HTMLFormControlsCollection;

interface Form extends HTMLFormElement {
  readonly elements: FormElements;
}

export function PollingStationForm({ electionId, pollingStation, onSaved }: PollingStationFormProps) {
  const formRef = React.useRef<Form>(null);
  const { create, loading, error, data } = usePollingStationCreate();

  const handleSubmit = (event: React.FormEvent<Form>) => {
    event.preventDefault();

    const elements = event.currentTarget.elements;

    create(electionId, {
      number: parseInt(elements.number.value),
      house_number: "",
      locality: elements.locality.value,
      name: elements.name.value,
      number_of_voters: elements.number_of_voters?.value ? parseInt(elements.number_of_voters.value) : undefined,
      polling_station_type: elements.polling_station_type.value as PollingStationType,
      postal_code: elements.postal_code.value,
      street: elements.street.value,
    });
  };

  React.useEffect(() => {
    if (data) {
      onSaved?.(data);
    }
  }, [data, onSaved]);

  return (
    <div>
      {error && (
        <FormLayout.Alert>
          <Alert type="error">{error}</Alert>
        </FormLayout.Alert>
      )}
      {/** placeholdef for validation and error handling */}
      {/* {fieldErrors.id && <div>{fieldErrors.id}</div>} */}

      <Form ref={formRef} onSubmit={handleSubmit}>
        <FormLayout disabled={loading}>
          <FormLayout.Section title="Algemene gegevens">
            <input type="hidden" name="election_id" value={electionId} />
            <input type="hidden" name="id" value={pollingStation?.id} />

            <FormLayout.Row>
              <InputField name="number" label="Nummer" fieldWidth="narrow" value={pollingStation?.number} />
              <InputField name="name" label="Naam" value={pollingStation?.name} />
            </FormLayout.Row>

            <FormLayout.Field>
              <ChoiceList>
                <ChoiceList.Title>Soort stembureau</ChoiceList.Title>
                {labelForPollingStationType.entries.map((entry) => (
                  <ChoiceList.Radio
                    key={entry.key}
                    id={`"polling_station_type"-${entry.key}`}
                    name={"polling_station_type"}
                    value={entry.value}
                    defaultChecked={pollingStation?.polling_station_type === entry.key}
                    label={entry.value}
                  />
                ))}
              </ChoiceList>
            </FormLayout.Field>

            <InputField
              name="number_of_voters"
              label="Aantal kiesgerechtigden"
              subtext="Optioneel"
              value={pollingStation?.number_of_voters}
            />
          </FormLayout.Section>

          <FormLayout.Section title="Adres van het stembureau">
            <InputField name="street" label="Straatnaam en huisnummer" value={pollingStation?.street} />
            <FormLayout.Row>
              <InputField name="postal_code" fieldWidth="narrow" label="Postcode" value={pollingStation?.postal_code} />
              <InputField name="locality" label="Plaats" value={pollingStation?.locality} />
            </FormLayout.Row>
          </FormLayout.Section>

          <FormLayout.Controls>
            <Button type="submit">Opslaan en toevoegen</Button>
          </FormLayout.Controls>
        </FormLayout>
      </Form>
    </div>
  );
}
