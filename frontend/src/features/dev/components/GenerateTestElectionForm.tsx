import { ChangeEvent, FormEvent, Fragment, useState } from "react";

import { isSuccess } from "@/api/ApiResult";
import { useApiClient } from "@/api/useApiClient";
import { Button } from "@/components/ui/Button/Button";
import { Checkbox } from "@/components/ui/CheckboxAndRadio/CheckboxAndRadio";
import { Form } from "@/components/ui/Form/Form";
import { FormLayout } from "@/components/ui/Form/FormLayout";
import { InputField } from "@/components/ui/InputField/InputField";

const RANGE_HINT = "Gebruik notatie zoals 10..50 of 9..=45 of een enkel getal zoals 40";

const RANGE_FIELDS = [
  { key: "political_groups", label: "Aantal politieke partijen", placeholder: "20..50" },
  { key: "candidates_per_group", label: "Aantal kandidaten per partij", placeholder: "10..50" },
  { key: "polling_stations", label: "Aantal stembureaus", placeholder: "50..200" },
  { key: "voters", label: "Aantal kiezers", placeholder: "100_000..250_000" },
  { key: "seats", label: "Aantal zetels", placeholder: "9..=45" },
  { key: "first_data_entry", label: "Percentage afgeronde eerste invoer", placeholder: "100" },
  {
    key: "second_data_entry",
    label: "Percentage tweede invoer van de afgeronde eerste invoer",
    placeholder: "100",
  },
  { key: "turnout", label: "Opkomstpercentage", placeholder: "60..=85" },
  { key: "candidate_distribution_slope", label: "Kandidaten distributiehelling", placeholder: "1100" },
  { key: "political_group_distribution_slope", label: "Partijen distributiehelling", placeholder: "1100" },
] as const;

type RangeFieldKey = (typeof RANGE_FIELDS)[number]["key"];

type RangeFormState = Record<RangeFieldKey, string>;

interface FormState extends RangeFormState {
  with_data_entry: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
const INITIAL_RANGE_STATE: RangeFormState = Object.fromEntries(
  RANGE_FIELDS.map((field) => [field.key, ""] as const),
) as RangeFormState;

const INITIAL_FORM_STATE: FormState = {
  ...INITIAL_RANGE_STATE,
  with_data_entry: true,
};

export function GenerateTestElectionForm() {
  const client = useApiClient();
  const [formState, setFormState] = useState<FormState>(INITIAL_FORM_STATE);

  const updateRangeField = (field: RangeFieldKey) => (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const handleBooleanChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { checked } = event.target;
    setFormState((prev) => ({ ...prev, with_data_entry: checked }));
  };

  const submitForm = async () => {
    const payload = RANGE_FIELDS.reduce<Record<string, string | boolean>>(
      (acc, field) =>
        Object.assign(acc, { [field.key]: formState[field.key] ? formState[field.key] : field.placeholder }),
      { with_data_entry: formState.with_data_entry },
    );

    try {
      const response = await client.postRequest("/api/generate_test_election", payload);

      if (isSuccess(response)) {
        window.location.reload();
      } else {
        throw response;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      window.alert(`Failed to submit request: ${errorMessage}`);
    }
  };

  return (
    <Form
      onSubmit={(event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        void submitForm();
      }}
    >
      <FormLayout>
        {RANGE_FIELDS.map((field) => {
          const input = (
            <InputField
              id={field.key}
              key={field.key}
              name={field.key}
              label={field.label}
              placeholder={field.placeholder}
              value={formState[field.key]}
              onChange={updateRangeField(field.key)}
              hint={RANGE_HINT}
              fieldWidth="full"
            />
          );

          if (field.key === "seats") {
            return (
              <Fragment key={field.key}>
                {input}
                <Checkbox
                  id="with-data-entry"
                  name="with_data_entry"
                  label="Inclusief invoer"
                  checked={formState.with_data_entry}
                  onChange={handleBooleanChange}
                />
              </Fragment>
            );
          }

          return input;
        })}
        <Button type="submit">Genereer verkiezing</Button>
      </FormLayout>
    </Form>
  );
}

export default GenerateTestElectionForm;
