import { FormEvent, useState } from "react";
import { useNavigate } from "react-router";

import { Button } from "@/components/ui/Button/Button";
import { Form } from "@/components/ui/Form/Form";
import { FormLayout } from "@/components/ui/Form/FormLayout";
import { InputField } from "@/components/ui/InputField/InputField";
import { t } from "@/i18n/translate";
import { StringFormData } from "@/utils/stringFormData";
import { useCrud } from "@/api/useCrud";
import { PollingStationInvestigation } from "@/types/generated/openapi";

export function InvestigationReason() {
  const navigate = useNavigate();
  const [nonEmptyError, setNonEmptyError] = useState(false);
  const path: COMMITTEE_SESSION_INVESTIGATION_CREATE = `/api/committee_sessions/{committee_session_id}/investigations`;
  const { update } = useCrud<PollingStationInvestigation>({ update: path });

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formData = new StringFormData(event.currentTarget);
    const reason = formData.getString("reason");

    if (reason.length === 0) {
      setNonEmptyError(true);
      return;
    }

    setNonEmptyError(false);

    console.log(formData);
    // TODO: Handle form submission
    const response = await update({ polling_station_id, reason, });

    //void navigate("../print-corrigendum");
  };

  return (
    <Form title={t("investigations.reason_and_assignment.central_polling_station")} onSubmit={handleSubmit}>
      <FormLayout>
        <FormLayout.Section>
          <section className="sm">
            <ul className="mt-0 mb-0">
              <li>{t("investigations.reason_and_assignment.why_investigate_results")}</li>
              <li>{t("investigations.reason_and_assignment.csb_assignment")}</li>
            </ul>
          </section>
          <InputField
            type="text"
            fieldSize="text-area"
            name="reason"
            label={t("investigations.reason_and_assignment.title")}
            error={nonEmptyError ? t("form_errors.FORM_VALIDATION_RESULT_REQUIRED") : undefined}
          />
        </FormLayout.Section>
        <FormLayout.Controls>
          <Button type="submit">{t("next")}</Button>
        </FormLayout.Controls>
      </FormLayout>
    </Form>
  );
}
