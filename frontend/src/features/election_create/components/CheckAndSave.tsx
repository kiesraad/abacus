import { Navigate, useNavigate } from "react-router";

import { isSuccess } from "@/api/ApiResult";
import { useCrud } from "@/api/useCrud";
import { Button } from "@/components/ui/Button/Button";
import { useMessages } from "@/hooks/messages/useMessages";
import { t } from "@/i18n/translate";
import type {
  ELECTION_IMPORT_REQUEST_PATH,
  ElectionCreationRequest,
  ElectionWithPoliticalGroups,
} from "@/types/generated/openapi";
import { useElectionCreateContext } from "../hooks/useElectionCreateContext";
import type { ElectionCreateState } from "./ElectionCreateContextProvider";
import { ImportedElectionInformation } from "./ImportedElectionInformation";

function buildRequest(state: ElectionCreateState): ElectionCreationRequest | undefined {
  if (
    !state.committeeCategory ||
    !state.electionDefinitionData ||
    !state.electionDefinitionHash ||
    !state.candidateDefinitionData ||
    !state.candidateDefinitionHash
  ) {
    return undefined;
  }
  const definitions = {
    election_data: state.electionDefinitionData,
    election_hash: state.electionDefinitionHash,
    candidate_data: state.candidateDefinitionData,
    candidate_hash: state.candidateDefinitionHash,
  };

  switch (state.committeeCategory) {
    case "CSB":
      return { committee_category: "CSB", ...definitions };
    case "GSB":
      if (!state.countingMethod || state.numberOfVoters === undefined) {
        return undefined;
      }

      return {
        committee_category: "GSB",
        ...definitions,
        polling_station_data: state.pollingStationDefinitionData,
        polling_station_file_name: state.pollingStationDefinitionFileName,
        counting_method: state.countingMethod,
        number_of_voters: state.numberOfVoters,
        selected_region: state.gsbSelected,
      };
    default:
      return state.committeeCategory satisfies never;
  }
}

export function CheckAndSave() {
  const { pushMessage } = useMessages();
  const navigate = useNavigate();
  const { state } = useElectionCreateContext();
  const createPath: ELECTION_IMPORT_REQUEST_PATH = `/api/elections/import`;
  const { create } = useCrud<ElectionWithPoliticalGroups>({ createPath, throwAllErrors: true });

  const request = buildRequest(state);

  // if we are missing data, go back to the beginning
  if (!state.election || !request) {
    return <Navigate to="/elections/create" />;
  }
  const committeeCategory = request.committee_category;

  function handleSubmit(data: ElectionCreationRequest) {
    void create(data).then((result) => {
      if (isSuccess(result)) {
        pushMessage({
          title: t("election.message.election_created", {
            committee_category: t(`committee_category.${committeeCategory}.abbreviation`),
            name: result.data.name,
          }),
        });
        void navigate("/elections", { state: { success: true } });
      }
    });
  }

  return (
    <section className="md">
      <h2>{t("election.check_and_save.title")}</h2>
      <p className="mt-lg">{t("election.check_and_save.description")}</p>
      <ImportedElectionInformation
        election={state.election}
        committeeCategory={committeeCategory}
        pollingStations={state.pollingStations}
        countingMethod={state.countingMethod}
        numberOfVoters={state.numberOfVoters}
      />
      <div className="mt-xl">
        <Button
          type="submit"
          onClick={() => {
            handleSubmit(request);
          }}
        >
          {t("save")}
        </Button>
      </div>
    </section>
  );
}
