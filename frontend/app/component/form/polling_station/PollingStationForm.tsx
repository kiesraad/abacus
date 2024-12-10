import * as React from "react";

import { isSucceess, PollingStation, PollingStationRequest, PollingStationType, useCrud } from "@kiesraad/api";
import { t } from "@kiesraad/i18n";
import { Alert, Button, ChoiceList, Form, FormLayout, InputField } from "@kiesraad/ui";
import { deformatNumber } from "@kiesraad/util";

export interface PollingStationFormProps {
  electionId: number;
  pollingStation?: PollingStation;
  onSaved?: (pollingStation: PollingStation) => void;
  onCancel?: () => void;
}

export type FormElements = {
  [key in keyof PollingStation]: HTMLInputElement;
} & HTMLFormControlsCollection;

interface Form extends HTMLFormElement {
  readonly elements: FormElements;
}

export function PollingStationForm({ electionId, pollingStation, onSaved, onCancel }: PollingStationFormProps) {
  const formRef = React.useRef<Form>(null);
  const { requestState, create, update } = useCrud<PollingStation>({
    create: `/api/elections/${electionId}/polling_stations`,
    update: pollingStation ? `/api/polling_stations/${pollingStation.id}` : undefined,
  });

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
      house_number_addition: elements.house_number_addition?.value,
    };

    if (pollingStation) {
      void update(requestObj).then((result) => {
        if (isSucceess(result)) {
          onSaved?.(result.data);
        }
      });
    } else {
      void create(requestObj).then((result) => {
        if (isSucceess(result)) {
          onSaved?.(result.data);
        }
      });
    }
  };

  return (
    <div>
      {requestState.status === "api-error" && (
        <FormLayout.Alert>
          <Alert type="error">{requestState.error.message}</Alert>
        </FormLayout.Alert>
      )}
      <Form ref={formRef} onSubmit={handleSubmit} id="polling-station-form">
        <FormLayout disabled={requestState.status === "loading"}>
          <FormLayout.Section title={t("general_details")}>
            <input type="hidden" id="election_id" name="election_id" defaultValue={electionId} />
            <input type="hidden" id="id" name="id" defaultValue={pollingStation?.id} />

            <FormLayout.Row>
              <InputField
                id="number"
                name="number"
                label={t("number")}
                fieldWidth="narrow"
                defaultValue={pollingStation?.number}
                pattern="[0-9]*"
              />
              <InputField id="name" name="name" label={t("name")} defaultValue={pollingStation?.name} />
            </FormLayout.Row>

            <FormLayout.Field>
              <ChoiceList>
                <ChoiceList.Title>{t("polling_station.title.type")}</ChoiceList.Title>
                <ChoiceList.Radio
                  id={`polling_station_type-FixedLocation`}
                  name={"polling_station_type"}
                  defaultValue={"FixedLocation"}
                  defaultChecked={pollingStation?.polling_station_type === "FixedLocation"}
                  label={t("polling_station.type.FixedLocation")}
                />
                <ChoiceList.Radio
                  id={`polling_station_type-Special`}
                  name={"polling_station_type"}
                  defaultValue={"Special"}
                  defaultChecked={pollingStation?.polling_station_type === "Special"}
                  label={t("polling_station.type.Special")}
                />
                <ChoiceList.Radio
                  id={`polling_station_type-Mobile`}
                  name={"polling_station_type"}
                  defaultValue={"Mobile"}
                  defaultChecked={pollingStation?.polling_station_type === "Mobile"}
                  label={t("polling_station.type.Mobile")}
                />
              </ChoiceList>
            </FormLayout.Field>

            <InputField
              id="number_of_voters"
              name="number_of_voters"
              label={t("polling_station.number_of_voters")}
              subtext={t("optional")}
              fieldWidth="narrow-field"
              defaultValue={pollingStation?.number_of_voters}
              numberInput
            />
          </FormLayout.Section>

          <FormLayout.Section title={t("polling_station.title.address")}>
            <FormLayout.Row>
              <InputField
                id="street"
                name="street"
                label={t("polling_station.street")}
                defaultValue={pollingStation?.street}
              />
              <InputField
                id="house_number"
                name="house_number"
                fieldWidth="narrow"
                label={t("polling_station.house_number")}
                defaultValue={pollingStation?.house_number}
              />
              <InputField
                id="house_number_addition"
                name="house_number_addition"
                fieldWidth="narrow"
                label={t("polling_station.house_number_addition")}
                defaultValue={pollingStation?.house_number_addition}
              />
            </FormLayout.Row>
            <FormLayout.Row>
              <InputField
                id="postal_code"
                name="postal_code"
                fieldWidth="narrow"
                label={t("polling_station.zipcode")}
                defaultValue={pollingStation?.postal_code}
              />
              <InputField
                id="locality"
                name="locality"
                label={t("polling_station.locality")}
                defaultValue={pollingStation?.locality}
              />
            </FormLayout.Row>
          </FormLayout.Section>

          <FormLayout.Controls>
            <Button type="submit" name="submit">
              {pollingStation ? t("polling_station.form.save_update") : t("polling_station.form.save_create")}
            </Button>
            {pollingStation && onCancel && (
              <Button variant="secondary" name="cancel" onClick={onCancel}>
                {t("cancel")}
              </Button>
            )}
          </FormLayout.Controls>
        </FormLayout>
      </Form>
    </div>
  );
}
