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
import {
  PollingStationInvestigationCreateRequest,
  PollingStationInvestigationUpdateRequest,
} from "@/types/generated/openapi";
import { StringFormData } from "@/utils/stringFormData";

interface InvestigationReasonProps {
  pollingStationId: number;
}

export function InvestigationReason({ pollingStationId }: InvestigationReasonProps) {
  const navigate = useNavigate();
  const { investigation, refetch } = useElection(pollingStationId);
  const [nonEmptyError, setNonEmptyError] = useState(false);
  const path = `/api/polling_stations/${pollingStationId}/investigation`;
  const { create } = useCrud<PollingStationInvestigationCreateRequest>(path);
  const { update } = useCrud<PollingStationInvestigationUpdateRequest>(path);
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

    const save = () => {
      if (investigation != undefined) {
        return update({
          reason,
          findings: investigation.findings,
          corrected_results: investigation.corrected_results,
        });
      }

      return create({ reason });
    };

    const response = await save();

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
          <Button type="submit">{investigation ? t("save") : t("next")}</Button>
        </FormLayout.Controls>
      </FormLayout>
    </Form>
  );
}
