import { Navigate, useNavigate } from "react-router";

import { isError, isSuccess } from "@/api/ApiResult";
import { useCrud } from "@/api/useCrud";
import { Button } from "@/components/ui/Button/Button";
import { useElectionList } from "@/hooks/election/useElectionList";
import { t } from "@/i18n/translate";
import { ELECTION_IMPORT_REQUEST_PATH, ElectionAndCandidatesDefinitionImportRequest } from "@/types/generated/openapi";

import { useElectionCreateContext } from "../hooks/useElectionCreateContext";

export function CheckAndSave() {
  const navigate = useNavigate();
  const { state } = useElectionCreateContext();
  const { refetch } = useElectionList();
  const path: ELECTION_IMPORT_REQUEST_PATH = `/api/elections/import`;
  const { create } = useCrud<ElectionAndCandidatesDefinitionImportRequest>({ create: path });

  if (!state.election) {
    return <Navigate to="/elections/create" />;
  }

  async function handleSubmit() {
    const response = await create({
      election_data: state.electionDefinitionData,
      election_hash: state.electionDefinitionHash,
      candidate_data: state.candidateDefinitionData,
      candidate_hash: state.candidateDefinitionHash,
    });

    if (isSuccess(response)) {
      await refetch();
      await navigate("/elections");
    } else if (isError(response)) {
      throw new Error();
    }
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
      <div className="mt-xl">
        <Button onClick={() => void handleSubmit()}>{t("save")}</Button>
      </div>
    </section>
  );
}
