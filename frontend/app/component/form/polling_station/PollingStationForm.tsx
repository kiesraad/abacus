import * as React from "react";

import {
  labelForPollingStationType,
  PollingStation,
  PollingStationRequest,
  PollingStationType,
  usePollingStationMutation,
} from "@kiesraad/api";
import { Alert, Button, ChoiceList, Form, FormLayout, InputField } from "@kiesraad/ui";
import { deformatNumber } from "@kiesraad/util";

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
  const { create, update, requestState } = usePollingStationMutation();

  const handleSubmit = (event: React.FormEvent<Form>) => {
    event.preventDefault();
    const elements = event.currentTarget.elements;
    const requestObj: PollingStationRequest = {
      number: parseInt(elements.number.value),
      locality: elements.locality.value,
      name: elements.name.value,
      number_of_voters: elements.number_of_voters?.value ? deformatNumber(elements.number_of_voters.value) : undefined,
      polling_station_type: elements.polling_station_type.value as PollingStationType,
      postal_code: elements.postal_code.value,
      street: elements.street.value,
      house_number: elements.house_number.value,
    };

    if (pollingStation) {
      update(pollingStation.id, requestObj);
    } else {
      create(electionId, requestObj);
    }
  };

  React.useEffect(() => {
    if (requestState.status === "success") {
      onSaved?.(requestState.data);
    }
  }, [requestState, onSaved]);

  return (
    <div>
      {requestState.status === "api-error" && (
        <FormLayout.Alert>
          <Alert type="error">{requestState.error.message}</Alert>
        </FormLayout.Alert>
      )}

      <Form ref={formRef} onSubmit={handleSubmit} id="polling-station-form">
        <FormLayout disabled={requestState.status === "loading"}>
          <FormLayout.Section title="Algemene gegevens">
            <input type="hidden" id="election_id" name="election_id" defaultValue={electionId} />
            <input type="hidden" id="id" name="id" defaultValue={pollingStation?.id} />

            {/* props that are not in design but are in the pollingstation model */}
            <div className="hidden">
              <input type="text" id="house_number" name="house_number" defaultValue={pollingStation?.house_number} />
            </div>

            <FormLayout.Row>
              <InputField
                id="number"
                name="number"
                label="Nummer"
                fieldWidth="narrow"
                defaultValue={pollingStation?.number}
              />
              <InputField id="name" name="name" label="Naam" defaultValue={pollingStation?.name} />
            </FormLayout.Row>

            <FormLayout.Field>
              <ChoiceList>
                <ChoiceList.Title>Soort stembureau</ChoiceList.Title>
                {labelForPollingStationType.entries.map((entry) => (
                  <ChoiceList.Radio
                    key={entry.key}
                    id={`polling_station_type-${entry.key}`}
                    name={"polling_station_type"}
                    defaultValue={entry.key}
                    defaultChecked={pollingStation?.polling_station_type === entry.key}
                    label={entry.value}
                  />
                ))}
              </ChoiceList>
            </FormLayout.Field>

            <InputField
              id="number_of_voters"
              name="number_of_voters"
              label="Aantal kiesgerechtigden"
              subtext="Optioneel"
              fieldWidth="narrow"
              defaultValue={pollingStation?.number_of_voters}
              numberInput
            />
          </FormLayout.Section>

          <FormLayout.Section title="Adres van het stembureau">
            <InputField
              id="street"
              name="street"
              label="Straatnaam en huisnummer"
              defaultValue={pollingStation?.street}
            />
            <FormLayout.Row>
              <InputField
                id="postal_code"
                name="postal_code"
                fieldWidth="narrow"
                label="Postcode"
                defaultValue={pollingStation?.postal_code}
              />
              <InputField id="locality" name="locality" label="Plaats" defaultValue={pollingStation?.locality} />
            </FormLayout.Row>
          </FormLayout.Section>

          <FormLayout.Controls>
            <Button type="submit" name="submit">
              Opslaan en toevoegen
            </Button>
          </FormLayout.Controls>
        </FormLayout>
      </Form>
    </div>
  );
}
