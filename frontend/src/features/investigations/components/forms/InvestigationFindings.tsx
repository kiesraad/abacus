import { type FormEvent, useState } from "react";
import { useNavigate } from "react-router";

import { type AnyApiError, ApiError, type ApiResult, isSuccess } from "@/api/ApiResult";
import { useCrud } from "@/api/useCrud";
import { Alert } from "@/components/ui/Alert/Alert";
import { Button } from "@/components/ui/Button/Button";
import { Checkbox } from "@/components/ui/CheckboxAndRadio/CheckboxAndRadio";
import { ChoiceList } from "@/components/ui/CheckboxAndRadio/ChoiceList";
import { Form } from "@/components/ui/Form/Form";
import { FormLayout } from "@/components/ui/Form/FormLayout";
import { InputField } from "@/components/ui/InputField/InputField";
import { Loader } from "@/components/ui/Loader/Loader";
import { useElection } from "@/hooks/election/useElection";
import { useMessages } from "@/hooks/messages/useMessages";
import { t } from "@/i18n/translate";
import type {
  PollingStationInvestigation,
  PollingStationInvestigationConcludeRequest,
  PollingStationInvestigationUpdateRequest,
} from "@/types/generated/openapi";
import { StringFormData } from "@/utils/stringFormData";

import { getInvestigationUpdatedMessage } from "../../utils/messages";

interface InvestigationFindingsProps {
  pollingStationId: number;
}

const ACCEPTED = "accepted";

// biome-ignore lint/complexity/noExcessiveLinesPerFunction: TODO function should be refactored
export function InvestigationFindings({ pollingStationId }: InvestigationFindingsProps) {
  const navigate = useNavigate();
  const { hasMessages } = useMessages();
  const { currentCommitteeSession, election, investigation, pollingStation, refetch } = useElection(pollingStationId);
  const { pushMessage } = useMessages();
  const updatePath = `/api/polling_stations/${pollingStationId}/investigation`;
  const concludePath = `/api/polling_stations/${pollingStationId}/investigation/conclude`;
  const { update, create: conclude } = useCrud<PollingStationInvestigation>({
    updatePath,
    createPath: concludePath,
  });

  const [nonEmptyError, setNonEmptyError] = useState(false);
  const [radioError, setRadioError] = useState(false);
  const [error, setError] = useState<AnyApiError>();
  const [showDataEntryWarning, setShowDataEntryWarning] = useState(false);
  const [warningNotAcceptedError, setWarningNotAcceptedError] = useState(false);

  if (!investigation || !pollingStation) {
    return <Loader />;
  }

  if (error) {
    throw error;
  }

  const requiresCorrectedResults = !pollingStation.id_prev_session;

  // biome-ignore lint/complexity/noExcessiveLinesPerFunction: TODO function should be refactored
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setNonEmptyError(false);
    setRadioError(false);
    setWarningNotAcceptedError(false);

    const formData = new StringFormData(event.currentTarget);
    const findings = formData.getString("findings");
    const correctedResultsChoice = formData.get("corrected_results");
    const acceptDataEntryDeletion = formData.get("accept_data_entry_deletion") === ACCEPTED;

    let error = false;

    if (findings.length === 0) {
      setNonEmptyError(true);
      error = true;
    }

    if (!requiresCorrectedResults && correctedResultsChoice === null) {
      setRadioError(true);
      error = true;
    }

    if (showDataEntryWarning && !acceptDataEntryDeletion) {
      setWarningNotAcceptedError(true);
      error = true;
    }

    if (error) {
      return;
    }

    const correctedResults = requiresCorrectedResults || correctedResultsChoice === "yes";

    const save = (): Promise<
      ApiResult<PollingStationInvestigationConcludeRequest | PollingStationInvestigationUpdateRequest>
    > => {
      if (investigation.findings !== undefined) {
        return update({
          reason: investigation.reason,
          findings,
          corrected_results: correctedResults,
          accept_data_entry_deletion: acceptDataEntryDeletion,
        } satisfies PollingStationInvestigationUpdateRequest);
      } else {
        return conclude({
          findings,
          corrected_results: correctedResults,
        } satisfies PollingStationInvestigationConcludeRequest);
      }
    };

    const response = await save();

    if (isSuccess(response)) {
      // Only push a message if there are no messages yet (e.g. from creating this investigation)
      if (!hasMessages()) {
        pushMessage(getInvestigationUpdatedMessage(pollingStation, currentCommitteeSession.status));
      }

      await refetch();
      await navigate(`/elections/${election.id}/investigations`);
    } else {
      if (response instanceof ApiError && response.reference === "InvestigationHasDataEntryOrResult") {
        setShowDataEntryWarning(true);
      } else {
        setError(response);
      }
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
            id="findings"
            type="text"
            fieldSize="text-area"
            name="findings"
            label={t("investigations.findings.title")}
            error={nonEmptyError ? t("investigations.findings.error") : undefined}
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
              id="corrected_results_no"
              name="corrected_results"
              value="no"
              label={t("no")}
              disabled={requiresCorrectedResults}
              defaultChecked={investigation.corrected_results === false}
            >
              {t("investigations.findings.corrected_result_no")}
            </ChoiceList.Radio>
            <ChoiceList.Radio
              id="corrected_results_yes"
              name="corrected_results"
              value="yes"
              label={t("yes")}
              disabled={requiresCorrectedResults}
              defaultChecked={requiresCorrectedResults || investigation.corrected_results === true}
            >
              {t("investigations.findings.corrected_result_yes")}
            </ChoiceList.Radio>
          </ChoiceList>

          {showDataEntryWarning && (
            <>
              <Alert type={warningNotAcceptedError ? "error" : "warning"} small>
                {t("investigations.findings.results_will_be_deleted")}
              </Alert>
              <Checkbox
                id="accept_data_entry_deletion"
                name="accept_data_entry_deletion"
                label={t("investigations.findings.accept_and_delete_results")}
                value={ACCEPTED}
                hasError={warningNotAcceptedError}
              />
            </>
          )}
        </FormLayout.Section>
        <FormLayout.Controls>
          <Button type="submit">{t("save")}</Button>
        </FormLayout.Controls>
      </FormLayout>
    </Form>
  );
}
