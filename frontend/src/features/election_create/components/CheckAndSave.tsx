import { Navigate, useNavigate } from "react-router";

import { isError, isSuccess } from "@/api/ApiResult";
import { useCrud } from "@/api/useCrud";
import { Button } from "@/components/ui/Button/Button";
import { t } from "@/i18n/translate";
import { ELECTION_IMPORT_REQUEST_PATH, ElectionDefinitionImportRequest } from "@/types/generated/openapi";

import { useElectionCreateContext } from "../hooks/useElectionCreateContext";

export function CheckAndSave() {
  const navigate = useNavigate();
  const { state } = useElectionCreateContext();
  const path: ELECTION_IMPORT_REQUEST_PATH = `/api/elections/import`;
  const { create } = useCrud<ElectionDefinitionImportRequest>({ create: path });

  if (!state.election) {
    return <Navigate to="/elections/create" />;
  }

  async function handleSubmit() {
    const response = await create({
      data: state.electionDefinitionData,
      hash: state.electionDefinitionHash,
    });

    if (isSuccess(response)) {
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
