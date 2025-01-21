import * as React from "react";

import { isSuccess, PollingStation, PollingStationRequest, useCrud } from "@kiesraad/api";
import { t } from "@kiesraad/i18n";
import { Alert, Button, ChoiceList, Form, FormLayout, InputField } from "@kiesraad/ui";
import { FormFields, useForm } from "@kiesraad/util";

export interface PollingStationFormProps {
  electionId: number;
  pollingStation?: PollingStation;
  onSaved?: (pollingStation: PollingStation) => void;
  onCancel?: () => void;
}

export type FormElements = {
  [key in keyof PollingStationRequest]: HTMLInputElement;
} & HTMLFormControlsCollection;

interface Form extends HTMLFormElement {
  readonly elements: FormElements;
}

const formFields: FormFields<PollingStationRequest> = {
  number: { required: true, type: "number" },
  name: { required: true, type: "string" },
  polling_station_type: { type: "string", mapUndefined: true },
  number_of_voters: { type: "number", isFormatted: true },
  address: { type: "string" },
  postal_code: { type: "string" },
  locality: { type: "string" },
};

export function PollingStationForm({ electionId, pollingStation, onSaved, onCancel }: PollingStationFormProps) {
  const formRef = React.useRef<Form>(null);

  const { process, isValid, validationResult } = useForm<PollingStationRequest>(formFields);
  const { requestState, create, update } = useCrud<PollingStation>({
    create: `/api/elections/${electionId}/polling_stations`,
    update: pollingStation ? `/api/elections/${electionId}/polling_stations/${pollingStation.id}` : undefined,
  });

  const handleSubmit = (event: React.FormEvent<Form>) => {
    event.preventDefault();
    const elements = event.currentTarget.elements;

    const { isValid, requestObject } = process(elements);
    if (!isValid) {
      window.scrollTo(0, 0);
      return;
    }
    if (pollingStation) {
      void update(requestObject).then((result) => {
        if (isSuccess(result)) {
          onSaved?.(result.data);
        } else {
          window.scrollTo(0, 0);
        }
      });
    } else {
      void create(requestObject).then((result) => {
        if (isSuccess(result)) {
          onSaved?.(result.data);
        } else {
          window.scrollTo(0, 0);
        }
      });
    }
  };

  let numberFieldError;
  if (validationResult.number) {
    numberFieldError = t(`form_errors.${validationResult.number}`);
  } else if (isValid && requestState.status === "api-error" && requestState.error.reference === "EntryNotUnique") {
    numberFieldError = t("polling_station.form.not_unique.error");
  }

  return (
    <div>
      {isValid && requestState.status === "api-error" && (
        <FormLayout.Alert>
          {requestState.error.reference === "EntryNotUnique" ? (
            <Alert type="error">
              <h2>
                {t("polling_station.form.not_unique.title", { number: formRef.current?.elements.number.value || "-1" })}
              </h2>
              <p>{t("polling_station.form.not_unique.description")}</p>
            </Alert>
          ) : (
            <Alert type="error">
              {requestState.error.code}: {requestState.error.message}
            </Alert>
          )}
        </FormLayout.Alert>
      )}
      <Form onSubmit={handleSubmit} id="polling-station-form" ref={formRef}>
        <FormLayout disabled={requestState.status === "loading"}>
          <FormLayout.Section title={t("general_details")}>
            <input type="hidden" id="election_id" name="election_id" defaultValue={electionId} />
            <input type="hidden" id="id" name="id" defaultValue={pollingStation?.id} />

            <FormLayout.Row>
              <InputField
                id="number"
                name="number"
                label={t("number")}
                fieldWidth="narrowest"
                margin="mb-md-lg"
                defaultValue={pollingStation?.number}
                error={numberFieldError}
                hideErrorMessage={
                  requestState.status === "api-error" && requestState.error.reference !== "EntryNotUnique"
                }
              />
              <InputField
                id="name"
                name="name"
                label={t("name")}
                margin="mb-md-lg"
                defaultValue={pollingStation?.name}
                error={validationResult.name ? t(`form_errors.${validationResult.name}`) : undefined}
              />
            </FormLayout.Row>

            <FormLayout.Field>
              <ChoiceList>
                <ChoiceList.Title>{t("polling_station.title.type")}</ChoiceList.Title>
                {validationResult.polling_station_type && (
                  <ChoiceList.Error>{t(`form_errors.${validationResult.polling_station_type}`)}</ChoiceList.Error>
                )}
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
                <ChoiceList.Radio
                  id={`polling_station_type-Undefined`}
                  name={"polling_station_type"}
                  defaultValue={"Undefined"}
                  defaultChecked={pollingStation?.polling_station_type === undefined}
                  label={t("polling_station.type.Unknown")}
                />
              </ChoiceList>
            </FormLayout.Field>

            <InputField
              id="number_of_voters"
              name="number_of_voters"
              label={t("polling_station.number_of_voters")}
              subtext={t("optional")}
              fieldWidth="full-field-with-narrowest-input"
              margin="mb-md-lg"
              defaultValue={pollingStation?.number_of_voters}
              error={
                validationResult.number_of_voters ? t(`form_errors.${validationResult.number_of_voters}`) : undefined
              }
              numberInput
            />
          </FormLayout.Section>

          <FormLayout.Section title={t("polling_station.title.address")}>
            <FormLayout.Row>
              <InputField
                id="address"
                name="address"
                fieldWidth="full"
                margin="mb-md-lg"
                label={t("polling_station.address")}
                defaultValue={pollingStation?.address}
                error={validationResult.address ? t(`form_errors.${validationResult.address}`) : undefined}
              />
            </FormLayout.Row>
            <FormLayout.Row>
              <InputField
                id="postal_code"
                name="postal_code"
                fieldWidth="narrowest"
                margin="mb-md-lg"
                label={t("polling_station.postal_code")}
                defaultValue={pollingStation?.postal_code}
                error={validationResult.postal_code ? t(`form_errors.${validationResult.postal_code}`) : undefined}
              />
              <InputField
                id="locality"
                name="locality"
                margin="mb-md-lg"
                label={t("polling_station.locality")}
                defaultValue={pollingStation?.locality}
                error={validationResult.locality ? t(`form_errors.${validationResult.locality}`) : undefined}
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
