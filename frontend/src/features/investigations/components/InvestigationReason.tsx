import { FormEvent, useState } from "react";
import { Form, useNavigate } from "react-router";

import { BottomBar } from "@/components/ui/BottomBar/BottomBar";
import { Button } from "@/components/ui/Button/Button";
import { FormLayout } from "@/components/ui/Form/FormLayout";
import { InputField } from "@/components/ui/InputField/InputField";
import { KeyboardKeys } from "@/components/ui/KeyboardKeys/KeyboardKeys";
import { t, tx } from "@/i18n/translate";
import { KeyboardKey } from "@/types/ui";
import { StringFormData } from "@/utils/stringFormData";

export function InvestigationReason() {
  const navigate = useNavigate();
  const [nonEmptyError, setNonEmptyError] = useState(false);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formData = new StringFormData(event.currentTarget);
    const reason = formData.getString("reason");

    if (reason.length === 0) {
      setNonEmptyError(true);
      return;
    }

    setNonEmptyError(false);

    // TODO: Handle form submission

    void navigate("../print-corrigendum");
  };

  return (
    <Form onSubmit={handleSubmit}>
      <FormLayout>
        <FormLayout.Section>
          <section>
            <h2>{t("investigations.reason_and_assignment.central_polling_station")}</h2>
            {tx("investigations.reason_and_assignment.instructions")}
          </section>
          <FormLayout.Row>
            <InputField
              type="text"
              fieldSize="text-area"
              name="reason"
              label={t("investigations.reason_and_assignment.title")}
              error={nonEmptyError ? t("form_errors.FORM_VALIDATION_RESULT_REQUIRED") : undefined}
            />
          </FormLayout.Row>
        </FormLayout.Section>
        <FormLayout.Controls>
          <BottomBar>
            <BottomBar.Row>
              <Button type="submit">{t("next")}</Button>
              <KeyboardKeys keys={[KeyboardKey.Shift, KeyboardKey.Enter]} />
            </BottomBar.Row>
          </BottomBar>
        </FormLayout.Controls>
      </FormLayout>
    </Form>
  );
}
