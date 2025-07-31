import { FormEvent } from "react";

import { Button } from "@/components/ui/Button/Button";
import { Form } from "@/components/ui/Form/Form";
import { FormLayout } from "@/components/ui/Form/FormLayout";
import { InputField } from "@/components/ui/InputField/InputField";
import { t } from "@/i18n/translate";
import { deformatNumber } from "@/utils/number";

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
    const formData = new FormData(event.currentTarget);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
    const voters = formData.get("number_of_voters") as string;
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
              defaultValue={defaultValue}
            />

            <FormLayout.Controls>
              <Button size="lg" type="submit">
                {button}
              </Button>
            </FormLayout.Controls>
          </FormLayout.Section>
        </FormLayout>
      </Form>
    </>
  );
}
