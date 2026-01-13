import { type FormEvent, useState } from "react";
import { useNavigate } from "react-router";

import { isSuccess } from "@/api/ApiResult";
import { useCrud } from "@/api/useCrud";
import { Button } from "@/components/ui/Button/Button";
import { Form } from "@/components/ui/Form/Form";
import { FormLayout } from "@/components/ui/Form/FormLayout";
import { InputField } from "@/components/ui/InputField/InputField";
import { Loader } from "@/components/ui/Loader/Loader";
import { useElection } from "@/hooks/election/useElection";
import { useMessages } from "@/hooks/messages/useMessages";
import { t } from "@/i18n/translate";
import type {
  POLLING_STATION_INVESTIGATION_CREATE_REQUEST_PATH,
  POLLING_STATION_INVESTIGATION_UPDATE_REQUEST_PATH,
  PollingStationInvestigation,
  PollingStationInvestigationCreateRequest,
  PollingStationInvestigationUpdateRequest,
} from "@/types/generated/openapi";
import { StringFormData } from "@/utils/stringFormData";

import { getInvestigationUpdatedMessage } from "../../utils/messages";

interface InvestigationReasonProps {
  pollingStationId: number;
}

// biome-ignore lint/complexity/noExcessiveLinesPerFunction: TODO function should be refactored
export function InvestigationReason({ pollingStationId }: InvestigationReasonProps) {
  const navigate = useNavigate();
  const { currentCommitteeSession, investigation, pollingStation, refetch } = useElection(pollingStationId);
  const { pushMessage } = useMessages();
  const [nonEmptyError, setNonEmptyError] = useState(false);
  const updatePath: POLLING_STATION_INVESTIGATION_UPDATE_REQUEST_PATH = `/api/polling_stations/${pollingStationId}/investigation`;
  const createPath: POLLING_STATION_INVESTIGATION_CREATE_REQUEST_PATH = `/api/polling_stations/${pollingStationId}/investigation`;
  const { create, update } = useCrud<PollingStationInvestigation>({ updatePath, createPath, throwAllErrors: true });

  if (!pollingStation) {
    return <Loader />;
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
      if (investigation !== undefined) {
        pushMessage(getInvestigationUpdatedMessage(pollingStation, currentCommitteeSession.status));
        void refetch();
        return update({
          reason,
          findings: investigation.findings,
          corrected_results: investigation.corrected_results,
        } satisfies PollingStationInvestigationUpdateRequest);
      } else {
        if (currentCommitteeSession.status === "data_entry_finished") {
          pushMessage({
            type: "warning",
            title: t("generate_new_results"),
            text: `${t("investigations.message.investigation_created", {
              number: pollingStation.number,
              name: pollingStation.name,
            })}. ${t("documents_are_invalidated")}`,
          });
        } else {
          pushMessage({
            title: t("investigations.message.investigation_created", {
              number: pollingStation.number,
              name: pollingStation.name,
            }),
          });
        }
        void refetch();
        return create({ reason } satisfies PollingStationInvestigationCreateRequest);
      }
    };

    const response = await save();

    if (isSuccess(response)) {
      await refetch();
      await navigate("../print-corrigendum");
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
            id="reason"
            type="text"
            fieldSize="text-area"
            name="reason"
            label={t("investigations.reason_and_assignment.title")}
            error={nonEmptyError ? t("investigations.reason_and_assignment.error") : undefined}
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
