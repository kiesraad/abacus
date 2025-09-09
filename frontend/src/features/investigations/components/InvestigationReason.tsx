import { FormEvent, useState } from "react";
import { useNavigate } from "react-router";

import { AnyApiError, isError, isSuccess } from "@/api/ApiResult";
import { useCrud } from "@/api/useCrud";
import { Button } from "@/components/ui/Button/Button";
import { Form } from "@/components/ui/Form/Form";
import { FormLayout } from "@/components/ui/Form/FormLayout";
import { InputField } from "@/components/ui/InputField/InputField";
import { useElection } from "@/hooks/election/useElection";
import { useNumericParam } from "@/hooks/useNumericParam";
import { t } from "@/i18n/translate";
import {
  COMMITTEE_SESSION_INVESTIGATION_CREATE_REQUEST_PATH,
  PollingStationInvestigationCreateRequest,
} from "@/types/generated/openapi";
import { StringFormData } from "@/utils/stringFormData";

export function InvestigationReason() {
  const navigate = useNavigate();
  const pollingStationId = useNumericParam("pollingStationId");
  const { currentCommitteeSession } = useElection();
  const [nonEmptyError, setNonEmptyError] = useState(false);
  const path: COMMITTEE_SESSION_INVESTIGATION_CREATE_REQUEST_PATH = `/api/committee_sessions/${currentCommitteeSession.id}/investigations`;
  const { create } = useCrud<PollingStationInvestigationCreateRequest>({ create: path });

  const [error, setError] = useState<AnyApiError>();

  if (error) {
    throw error;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formData = new StringFormData(event.currentTarget);
    const reason = formData.getString("reason");

    if (reason.length === 0) {
      setNonEmptyError(true);
      return;
    }

    setNonEmptyError(false);

    const response = await create({ polling_station_id: pollingStationId, reason });
    if (isSuccess(response)) {
      await navigate("../print-corrigendum");
    } else if (isError(response)) {
      setError(response);
    }
  };

  return (
    <Form
      title={t("investigations.reason_and_assignment.central_polling_station")}
      onSubmit={(e) => void handleSubmit(e)}
    >
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
