import { FormEvent } from "react";
import { Form, useNavigate } from "react-router";

import { Button } from "@/components/ui/Button/Button";
import { FormLayout } from "@/components/ui/Form/FormLayout";
import { InputField } from "@/components/ui/InputField/InputField";
import { KeyboardKeys } from "@/components/ui/KeyboardKeys/KeyboardKeys";
import { t, tx } from "@/i18n/translate";
import { KeyboardKey } from "@/types/ui";

export function InvestigationReason() {
  const navigate = useNavigate();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // TODO: Handle form submission
    void navigate("../print-corrigendum");
  };

  return (
    <Form onSubmit={handleSubmit}>
      <FormLayout>
        <FormLayout.Section>
          <div>
            <h2>{t("investigations.reason_and_assignment_of_central_polling_station")}</h2>
            {tx("investigations.reason_and_assignment_instructions")}
          </div>
          <FormLayout.Row>
            <InputField
              type="text"
              fieldSize="text-area"
              name="reason"
              label={t("investigations.reason_and_assignment")}
            />
          </FormLayout.Row>
        </FormLayout.Section>
        <FormLayout.Controls>
          <Button type="submit">{t("next")}</Button>
          <KeyboardKeys keys={[KeyboardKey.Shift, KeyboardKey.Enter]} />
        </FormLayout.Controls>
      </FormLayout>
    </Form>
  );
}
