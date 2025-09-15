import { FormEvent, useState } from "react";
import { useNavigate } from "react-router";

import { AnyApiError, isError, isSuccess } from "@/api/ApiResult";
import { useCrud } from "@/api/useCrud";
import { Button } from "@/components/ui/Button/Button";
import { ChoiceList } from "@/components/ui/CheckboxAndRadio/ChoiceList";
import { Form } from "@/components/ui/Form/Form";
import { FormLayout } from "@/components/ui/Form/FormLayout";
import { InputField } from "@/components/ui/InputField/InputField";
import { Loader } from "@/components/ui/Loader/Loader";
import { useElection } from "@/hooks/election/useElection";
import { t } from "@/i18n/translate";
import {
  PollingStationInvestigationConcludeRequest,
  PollingStationInvestigationUpdateRequest
} from "@/types/generated/openapi";
import { StringFormData } from "@/utils/stringFormData";

interface InvestigationFindingsProps {
  pollingStationId: number;
}

export function InvestigationFindings({ pollingStationId }: InvestigationFindingsProps) {
  const navigate = useNavigate();
  const { election, investigation, refetch } = useElection(pollingStationId);
  const concludePath = `/api/polling_stations/${pollingStationId}/investigation/conclude`;
  const { create: conclude } = useCrud<PollingStationInvestigationConcludeRequest>({ create: concludePath });
  const path = `/api/polling_stations/${pollingStationId}/investigation`;
  const { update } = useCrud<PollingStationInvestigationUpdateRequest>({ update: path });

  const [nonEmptyError, setNonEmptyError] = useState(false);
  const [radioError, setRadioError] = useState(false);
  const [apiError, setApiError] = useState<AnyApiError>();

  if (apiError) {
    throw apiError;
  }

  if (!investigation) {
    return <Loader />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setNonEmptyError(false);
    setRadioError(false);

    const formData = new StringFormData(event.currentTarget);
    const findings = formData.getString("findings");
    const correctedResultsChoice = formData.get("corrected_results");

    let error = false;

    if (findings.length === 0) {
      setNonEmptyError(true);
      error = true;
    }

    if (correctedResultsChoice === null) {
      setRadioError(true);
      error = true;
    }

    if (error) {
      return;
    }

    const correctedResults = correctedResultsChoice === "yes";

    const save = () => {
      if (investigation.findings !== undefined) {
        return update({
          reason: investigation.reason,
          findings,
          corrected_results: correctedResults,
        });
      }

      return conclude({
        findings,
        corrected_results: correctedResults,
      });
    };

    const response = await save();

    if (isSuccess(response)) {
      await refetch();
      await navigate(`/elections/${election.id}/investigations`);
    } else if (isError(response)) {
      setApiError(response);
    }
  };

  return (
    <Form title={t("investigations.findings.investigation_findings_title")} onSubmit={(e) => void handleSubmit(e)}>
      <FormLayout>
        <FormLayout.Section>
          <ul className="mt-0 mb-0">
            <li>{t("investigations.findings.note_investigation_result")}</li>
            <li>{t("investigations.findings.indicate_how_result_was_determined")}</li>
          </ul>
          <InputField
            type="text"
            fieldSize="text-area"
            name="findings"
            label={t("investigations.findings.title")}
            error={nonEmptyError ? t("form_errors.FORM_VALIDATION_RESULT_REQUIRED") : undefined}
            hint={t("investigations.findings.hint")}
            defaultValue={investigation.findings || ""}
          />
          <ChoiceList>
            <ChoiceList.Legend>{t("investigations.findings.corrected_result")}</ChoiceList.Legend>
            {radioError && (
              <ChoiceList.Error id="corrected_results_error">
                {t("investigations.findings.pick_corrected_result")}
              </ChoiceList.Error>
            )}
            <ChoiceList.Radio
              id="corrected_results_yes"
              name="corrected_results"
              value="yes"
              label={t("yes")}
              defaultChecked={investigation.corrected_results === true}
            >
              {t("investigations.findings.corrected_result_yes")}
            </ChoiceList.Radio>
            <ChoiceList.Radio
              id="corrected_results_no"
              name="corrected_results"
              value="no"
              label={t("no")}
              defaultChecked={investigation.corrected_results === false}
            >
              {t("investigations.findings.corrected_result_no")}
            </ChoiceList.Radio>
          </ChoiceList>
        </FormLayout.Section>
        <FormLayout.Controls>
          <Button type="submit">{t("save")}</Button>
        </FormLayout.Controls>
      </FormLayout>
    </Form>
  );
}
