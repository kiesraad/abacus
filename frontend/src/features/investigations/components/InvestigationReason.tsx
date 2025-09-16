import { FormEvent, useState } from "react";
import { useNavigate } from "react-router";

import { AnyApiError, isError, isSuccess } from "@/api/ApiResult";
import { useCrud } from "@/api/useCrud";
import { Button } from "@/components/ui/Button/Button";
import { Form } from "@/components/ui/Form/Form";
import { FormLayout } from "@/components/ui/Form/FormLayout";
import { InputField } from "@/components/ui/InputField/InputField";
import { useElection } from "@/hooks/election/useElection";
import { t } from "@/i18n/translate";
import { PollingStationInvestigation, PollingStationInvestigationCreateRequest } from "@/types/generated/openapi";
import { StringFormData } from "@/utils/stringFormData";

interface InvestigationReasonProps {
  pollingStationId: number;
  investigation?: PollingStationInvestigation;
}

export function InvestigationReason({ pollingStationId, investigation }: InvestigationReasonProps) {
  const navigate = useNavigate();
  const { refetch } = useElection();
  const [nonEmptyError, setNonEmptyError] = useState(false);
  const createPath = `/api/polling_stations/${pollingStationId}/investigations`;
  const { create } = useCrud<PollingStationInvestigationCreateRequest>({ create: createPath });
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

    const body: PollingStationInvestigationCreateRequest = { reason };
    const response = await create(body);

    if (isSuccess(response)) {
      await refetch();
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
            defaultValue={investigation?.reason}
          />
        </FormLayout.Section>
        <FormLayout.Controls>
          <Button type="submit">{t("next")}</Button>
        </FormLayout.Controls>
      </FormLayout>
    </Form>
  );
}
