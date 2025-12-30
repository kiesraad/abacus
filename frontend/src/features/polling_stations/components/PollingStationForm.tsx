import { type FormEvent, useState } from "react";

import { ApiError, isSuccess } from "@/api/ApiResult";
import { useCrud } from "@/api/useCrud";
import { Alert } from "@/components/ui/Alert/Alert";
import { Button } from "@/components/ui/Button/Button";
import { ChoiceList } from "@/components/ui/CheckboxAndRadio/ChoiceList";
import { Form } from "@/components/ui/Form/Form";
import { FormLayout } from "@/components/ui/Form/FormLayout";
import { InputField } from "@/components/ui/InputField/InputField";
import { t } from "@/i18n/translate";
import type { PollingStation, PollingStationRequest } from "@/types/generated/openapi";

import { useForm } from "../hooks/useForm";
import type { FormFields } from "../utils/form";

export interface PollingStationFormProps {
  electionId: number;
  pollingStation?: PollingStation;
  onSaved?: (pollingStation: PollingStation) => void;
  onCancel?: () => void;
}

export type FormElements = {
  [key in keyof PollingStationRequest]: HTMLInputElement;
} & HTMLFormControlsCollection;

interface HTMLForm extends HTMLFormElement {
  readonly elements: FormElements;
}

export function PollingStationForm({ electionId, pollingStation, onSaved, onCancel }: PollingStationFormProps) {
  const [lastSubmit, setLastSubmit] = useState<PollingStationRequest>();

  const isUpdate = !!pollingStation;
  const isPreExistingPollingStation = isUpdate && pollingStation.id_prev_session !== undefined;

  const formFields: FormFields<PollingStationRequest> = {
    number: isPreExistingPollingStation
      ? { type: "disabled" }
      : { required: true, type: "number", min: 1, max: 999999 },
    name: { required: true, type: "string" },
    polling_station_type: { type: "string", mapUndefined: true },
    number_of_voters: { type: "number" },
    address: { type: "string" },
    postal_code: { type: "string" },
    locality: { type: "string" },
  };

  const { process, isValid, validationResult } = useForm<PollingStationRequest>(formFields);
  const { create, update, error, isLoading } = useCrud<PollingStation>({
    createPath: `/api/elections/${electionId}/polling_stations`,
    updatePath: isUpdate ? `/api/elections/${electionId}/polling_stations/${pollingStation.id}` : undefined,
  });

  const handleSubmit = (event: FormEvent<HTMLForm>) => {
    event.preventDefault();
    const elements = event.currentTarget.elements;

    const { isValid, requestObject } = process(elements);
    if (!isValid) {
      window.scrollTo(0, 0);
      return;
    }

    setLastSubmit(requestObject);
    void (isUpdate ? update : create)(requestObject).then((result) => {
      if (isSuccess(result)) {
        onSaved?.(result.data);
      } else {
        window.scrollTo(0, 0);
      }
    });
  };

  let numberFieldError: string | undefined;
  if (validationResult.number) {
    numberFieldError = t(`form_errors.${validationResult.number}`);
  } else if (isValid && error instanceof ApiError && error.reference === "EntryNotUnique") {
    numberFieldError = t("polling_station.form.not_unique.error");
  }

  return (
    <div>
      {isValid && error && (
        <FormLayout.Alert>
          {error instanceof ApiError && error.reference === "EntryNotUnique" ? (
            <Alert type="error">
              <strong className="heading-md">
                {t("polling_station.form.not_unique.title", {
                  number: lastSubmit?.number ?? "-1",
                })}
              </strong>
              <p>{t("polling_station.form.not_unique.description")}</p>
            </Alert>
          ) : (
            <Alert type="error">
              <p>
                {error instanceof ApiError && error.code}: {error.message}
              </p>
            </Alert>
          )}
        </FormLayout.Alert>
      )}
      <Form title={t("polling_station.details")} onSubmit={handleSubmit} id="polling-station-form">
        <FormLayout disabled={isLoading}>
          <FormLayout.Section title={t("general_details")}>
            <input type="hidden" id="election_id" name="election_id" defaultValue={electionId} />
            <input type="hidden" id="id" name="id" defaultValue={pollingStation?.id} />

            <FormLayout.Row>
              <InputField
                id="number"
                name="number"
                label={t("number")}
                fieldWidth="narrowest"
                disabled={isPreExistingPollingStation}
                {...(isPreExistingPollingStation
                  ? { value: pollingStation.number }
                  : { defaultValue: pollingStation?.number })}
                error={numberFieldError}
                maxLength={6}
                hideErrorMessage={error instanceof ApiError ? error.reference !== "EntryNotUnique" : false}
              />
              <InputField
                id="name"
                name="name"
                label={t("name")}
                defaultValue={pollingStation?.name}
                error={validationResult.name ? t(`form_errors.${validationResult.name}`) : undefined}
              />
            </FormLayout.Row>

            <ChoiceList>
              <ChoiceList.Legend>{t("polling_station.title.type")}</ChoiceList.Legend>
              {validationResult.polling_station_type && (
                <ChoiceList.Error id="polling-station-type-error">
                  {t(`form_errors.${validationResult.polling_station_type}`)}
                </ChoiceList.Error>
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
                label={t("polling_station.type.SpecialExplanation")}
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

            <InputField
              id="number_of_voters"
              name="number_of_voters"
              label={t("number_of_voters")}
              subtext={t("optional")}
              fieldWidth="full-field-with-narrowest-input"
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
                label={t("polling_station.postal_code")}
                defaultValue={pollingStation?.postal_code}
                error={validationResult.postal_code ? t(`form_errors.${validationResult.postal_code}`) : undefined}
              />
              <InputField
                id="locality"
                name="locality"
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
              <Button type="button" variant="secondary" name="cancel" onClick={onCancel}>
                {t("cancel")}
              </Button>
            )}
          </FormLayout.Controls>
        </FormLayout>
      </Form>
    </div>
  );
}
