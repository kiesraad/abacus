import * as React from "react";

import { PollingStation, PollingStationRequest, PollingStationType, usePollingStationMutation } from "@kiesraad/api";
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
  [key in keyof PollingStationRequest]: HTMLInputElement;
} & HTMLFormControlsCollection;

interface Form extends HTMLFormElement {
  readonly elements: FormElements;
}

const validationRules: ValidationRules<PollingStationRequest> = {
  number: { required: true, type: "number", min: 1 },
  locality: { required: true, type: "string", minLength: 1 },
  name: { required: true, type: "string", minLength: 1 },
  number_of_voters: { type: "number", min: 0 },
  polling_station_type: { required: true, type: "string" },
  postal_code: { required: true, type: "string", minLength: 4 },
  street: { required: true, type: "string", minLength: 1 },
  house_number: { required: true, type: "string", minLength: 1 },
  house_number_addition: { type: "string" },
};

export function PollingStationForm({ electionId, pollingStation, onSaved, onCancel }: PollingStationFormProps) {
  const formRef = React.useRef<Form>(null);
  const { create, update, requestState } = usePollingStationMutation();
  const [validationResult, setValidationResult] = React.useState<ValidationResult<PollingStationRequest>>(
    {} as ValidationResult<PollingStationRequest>,
  );

  const handleSubmit = (event: React.FormEvent<Form>) => {
    event.preventDefault();
    const elements = event.currentTarget.elements;
    const requestObj: PollingStationRequest = {
      number: elements.number.value ? parseInt(elements.number.value) : ("" as unknown as number),
      locality: elements.locality.value,
      name: elements.name.value,
      number_of_voters: elements.number_of_voters?.value ? deformatNumber(elements.number_of_voters.value) : undefined,
      polling_station_type: elements.polling_station_type.value as PollingStationType,
      postal_code: elements.postal_code.value,
      street: elements.street.value,
      house_number: elements.house_number.value,
      house_number_addition: elements.house_number_addition?.value,
    };

    const [isValid, validationErrors] = validate(validationRules, requestObj);
    setValidationResult(validationErrors);
    if (!isValid) {
      return;
    }
    if (pollingStation) {
      update(pollingStation.id, requestObj);
    } else {
      create(electionId, requestObj);
    }
  };

  React.useEffect(() => {
    if (requestState.status === "api-error") {
      window.scrollTo(0, 0);
    }
    if (requestState.status === "success") {
      onSaved?.(requestState.data);
    }
  }, [requestState, onSaved]);

  let numberError = validationResult.number ? t(`form.errors.${validationResult.number}`) : undefined;
  if (requestState.status === "api-error" && requestState.error.reference === "EntryNotUnique") {
    numberError = t("polling_station.form.not_unique.title", {
      number: formRef.current?.elements.number.value || "-1",
    });
  }

  return (
    <div>
      {requestState.status === "api-error" && (
        <FormLayout.Alert>
          {requestState.error.reference === "EntryNotUnique" ? (
            <Alert type="error">
              <h2 id="testt">
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
                error={numberError}
                hideErrorMessage={true}
              />
              <InputField
                id="name"
                name="name"
                label={t("name")}
                defaultValue={pollingStation?.name}
                error={validationResult.name ? t(`form.errors.${validationResult.name}`) : undefined}
                hideErrorMessage={validationResult.name === "FORM_VALIDATION_RESULT_REQUIRED"}
              />
            </FormLayout.Row>

            {/* TODO: Choicelist (required) error handling */}
            {/* error={validationResult.polling_station_type ? t(`form.errors.${validationResult.polling_station_type}`) : undefined} */}
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
              error={
                validationResult.number_of_voters ? t(`form.errors.${validationResult.number_of_voters}`) : undefined
              }
              hideErrorMessage={validationResult.number_of_voters === "FORM_VALIDATION_RESULT_REQUIRED"}
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
                error={validationResult.street ? t(`form.errors.${validationResult.street}`) : undefined}
                hideErrorMessage={validationResult.street === "FORM_VALIDATION_RESULT_REQUIRED"}
              />
              <InputField
                id="house_number"
                name="house_number"
                fieldWidth="narrow"
                label={t("polling_station.house_number")}
                defaultValue={pollingStation?.house_number}
                error={validationResult.house_number ? t(`form.errors.${validationResult.house_number}`) : undefined}
                hideErrorMessage={validationResult.house_number === "FORM_VALIDATION_RESULT_REQUIRED"}
              />
              <InputField
                id="house_number_addition"
                name="house_number_addition"
                fieldWidth="narrow"
                label={t("polling_station.house_number_addition")}
                defaultValue={pollingStation?.house_number_addition}
                error={
                  validationResult.house_number_addition
                    ? t(`form.errors.${validationResult.house_number_addition}`)
                    : undefined
                }
              />
            </FormLayout.Row>
            <FormLayout.Row>
              <InputField
                id="postal_code"
                name="postal_code"
                fieldWidth="narrow"
                label={t("polling_station.zipcode")}
                defaultValue={pollingStation?.postal_code}
                error={validationResult.postal_code ? t(`form.errors.${validationResult.postal_code}`) : undefined}
                hideErrorMessage={validationResult.postal_code === "FORM_VALIDATION_RESULT_REQUIRED"}
              />
              <InputField
                id="locality"
                name="locality"
                label={t("polling_station.locality")}
                defaultValue={pollingStation?.locality}
                error={validationResult.locality ? t(`form.errors.${validationResult.locality}`) : undefined}
                hideErrorMessage={validationResult.locality === "FORM_VALIDATION_RESULT_REQUIRED"}
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

//Generic form validation utils

type ValidationError =
  | "FORM_VALIDATION_RESULT_REQUIRED"
  | "FORM_VALIDATION_RESULT_MIN_LENGTH"
  | "FORM_VALIDATION_RESULT_MAX_LENGTH"
  | "FORM_VALIDATION_RESULT_INVALID_TYPE"
  | "FORM_VALIDATION_RESULT_MIN"
  | "FORM_VALIDATION_RESULT_MAX";
type FieldRuleBase = {
  required?: boolean;
  type: string;
};

type FieldRuleString = FieldRuleBase & {
  type: "string";
  minLength?: number;
  maxLength?: number;
};

type FieldRuleNumber = FieldRuleBase & {
  type: "number";
  min?: number;
  max?: number;
};

type AnyFieldRule = FieldRuleString | FieldRuleNumber;
type ValidationRules<T> = Record<keyof T, AnyFieldRule>;
type ValidationResult<T> = Record<keyof T, ValidationError | undefined>;

function validate<T>(rules: ValidationRules<T>, obj: T): [boolean, ValidationResult<T>] {
  const result: ValidationResult<T> = {} as ValidationResult<T>;
  Object.entries(rules).forEach(([key, value]) => {
    const prop = key as keyof T;
    const inputValue = obj[prop];
    const rule = value as AnyFieldRule;
    if (inputValue === "" || inputValue === undefined) {
      if (rule.required) {
        result[prop] = "FORM_VALIDATION_RESULT_REQUIRED";
      }
      return;
    }
    switch (rule.type) {
      case "string":
        if (typeof inputValue === "string") {
          if (rule.minLength && inputValue.length < rule.minLength) {
            result[prop] = "FORM_VALIDATION_RESULT_MIN_LENGTH";
          }
          if (rule.maxLength && inputValue.length > rule.maxLength) {
            result[prop] = "FORM_VALIDATION_RESULT_MAX_LENGTH";
          }
        } else {
          result[prop] = "FORM_VALIDATION_RESULT_INVALID_TYPE";
        }
        break;
      case "number":
        if (typeof inputValue === "number") {
          if (rule.min && inputValue < rule.min) {
            result[prop] = "FORM_VALIDATION_RESULT_MIN_LENGTH";
          }
          if (rule.max && inputValue > rule.max) {
            result[prop] = "FORM_VALIDATION_RESULT_MAX_LENGTH";
          }
        } else {
          result[prop] = "FORM_VALIDATION_RESULT_INVALID_TYPE";
        }
    }
  });
  //check if result is empty
  const isEmpty = Object.values(result).every((value) => value === undefined);

  return [isEmpty, result];
}
