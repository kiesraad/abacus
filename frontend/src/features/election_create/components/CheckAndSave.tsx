import { Navigate, useNavigate } from "react-router";

import { isSuccess } from "@/api/ApiResult";
import { useCrud } from "@/api/useCrud";
import { Button } from "@/components/ui/Button/Button";
import { useMessages } from "@/hooks/messages/useMessages";
import { t } from "@/i18n/translate";
import type { ELECTION_IMPORT_REQUEST_PATH, ElectionWithPoliticalGroups } from "@/types/generated/openapi";
import { formatNumber } from "@/utils/number";
import { useElectionCreateContext } from "../hooks/useElectionCreateContext";

export function CheckAndSave() {
  const { pushMessage } = useMessages();
  const navigate = useNavigate();
  const { state } = useElectionCreateContext();
  const createPath: ELECTION_IMPORT_REQUEST_PATH = `/api/elections/import`;
  const { create } = useCrud<ElectionWithPoliticalGroups>({ createPath, throwAllErrors: true });

  function handleSubmit() {
    void create({
      election_data: state.electionDefinitionData,
      election_hash: state.electionDefinitionHash,
      candidate_data: state.candidateDefinitionData,
      candidate_hash: state.candidateDefinitionHash,
      polling_station_data: state.pollingStationDefinitionData,
      polling_station_file_name: state.pollingStationDefinitionFileName,
      counting_method: state.countingMethod,
      number_of_voters: state.numberOfVoters,
    }).then((result) => {
      if (isSuccess(result)) {
        pushMessage({
          title: t("election.message.election_created", {
            role: "GSB",
            name: result.data.name,
          }),
        });
        void navigate("/elections", { state: { success: true } });
      }
    });
  }

  // if no election, election data, candidate data or counting method is found in the state, go back to the beginning
  if (!state.election || !state.electionDefinitionData || !state.candidateDefinitionData || !state.countingMethod) {
    return <Navigate to="/elections/create" />;
  }

  return (
    <section className="md">
      <h2>{t("election.check_and_save.title")}</h2>
      <p className="mt-lg">{t("election.check_and_save.description")}</p>
      <ul>
        <li>
          <strong>{t("election.singular")}:</strong> {state.election.name}
        </li>
        <li>
          <strong>{t("area_designation")}:</strong> {state.election.location}
        </li>
      </ul>

      <ul>
        {state.pollingStations && (
          <li id="polling-stations-added">
            {t("election.polling_stations.added", { num: state.pollingStations.length })}
          </li>
        )}
        <li id="counting-method">{t(state.countingMethod)}</li>
        <li id="number-of-voters">
          {formatNumber(state.numberOfVoters)} {t("voters")}
        </li>
      </ul>
      <div className="mt-xl">
        <Button
          onClick={() => {
            handleSubmit();
          }}
        >
          {t("save")}
        </Button>
      </div>
    </section>
  );
}
