import { FormEvent } from "react";

import { Button } from "@/components/ui/Button/Button";
import { Form } from "@/components/ui/Form/Form";
import { FormLayout } from "@/components/ui/Form/FormLayout";
import { InputField } from "@/components/ui/InputField/InputField";
import { t } from "@/i18n/translate";
import { deformatNumber } from "@/utils/number";
import { StringFormData } from "@/utils/stringFormData";

interface NumberOfVotersFormProps {
  defaultValue?: number;
  instructions: string;
  hint: string | undefined;
  button: string;
  onSubmit: (numberOfVoters: number) => void;
}

export function NumberOfVotersForm({ defaultValue, instructions, hint, button, onSubmit }: NumberOfVotersFormProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new StringFormData(event.currentTarget);
    const voters = formData.getString("number_of_voters");
    onSubmit(deformatNumber(voters));
  }

  return (
    <>
      <Form onSubmit={handleSubmit}>
        <FormLayout>
          <FormLayout.Section title={t("election_management.how_many_voters")}>
            <p>{instructions}</p>

            <InputField
              id="number_of_voters"
              name="number_of_voters"
              label={t("number_of_voters")}
              hint={hint}
              fieldWidth="full-field-with-narrow-input"
              numberInput
              defaultValue={defaultValue || ""}
              autoFocus
            />

            <FormLayout.Controls>
              <Button type="submit">{button}</Button>
            </FormLayout.Controls>
          </FormLayout.Section>
        </FormLayout>
      </Form>
    </>
  );
}
