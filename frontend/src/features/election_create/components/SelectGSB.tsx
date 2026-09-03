import { type ReactNode, useState } from "react";
import { Navigate, useNavigate } from "react-router";

import { isError, isSuccess } from "@/api/ApiResult";
import { useCrud } from "@/api/useCrud";
import { Alert } from "@/components/ui/Alert/Alert";
import { Table } from "@/components/ui/Table/Table";
import { t } from "@/i18n/translate";
import type {
  ELECTION_IMPORT_VALIDATE_REQUEST_PATH,
  ElectionDefinitionValidateResponse,
  RegionDetails,
} from "@/types/generated/openapi";
import { useElectionCreateContext } from "../hooks/useElectionCreateContext";
import cls from "./SelectGSB.module.css";

function formatNumber(gsb: RegionDetails): string {
  return gsb.key.number === undefined ? "" : String(gsb.key.number).padStart(4, "0");
}

export function SelectGSB() {
  const { state, dispatch } = useElectionCreateContext();
  const navigate = useNavigate();
  const [error, setError] = useState<ReactNode | undefined>();
  const createPath: ELECTION_IMPORT_VALIDATE_REQUEST_PATH = `/api/elections/import/validate`;
  const { create } = useCrud<ElectionDefinitionValidateResponse>({ createPath });

  if (!state.gsbList) {
    return <Navigate to="/elections/create" />;
  }

  const gsbList = [...state.gsbList].sort((a, b) => a.name.localeCompare(b.name, "nl"));

  async function selectGSB(gsb: RegionDetails) {
    const response = await create({
      committee_category: state.committeeCategory,
      election_data: state.electionDefinitionData,
      election_hash: state.electionDefinitionHash,
      candidate_data: state.candidateDefinitionData,
      candidate_hash: state.candidateDefinitionHash,
      selected_region: gsb.key,
    });

    if (isSuccess(response)) {
      dispatch({
        type: "SET_GSB_SELECTED",
        response: response.data,
        gsbSelected: gsb.key,
      });
      await navigate("/elections/create/list-of-candidates");
    } else if (isError(response)) {
      setError(response.message);
    }
  }

  return (
    <section className={cls.container}>
      <h2>{t("election.select_gsb.title")}</h2>
      {error && (
        <Alert type="error" title={t("election.select_gsb.error")} inline>
          <p>{error}</p>
        </Alert>
      )}
      <Table className="mt-lg">
        <Table.Header>
          <Table.HeaderCell numberWidth className="text-align-r">
            {t("number")}
          </Table.HeaderCell>
          <Table.HeaderCell>{t("committee_category.GSB.short")}</Table.HeaderCell>
        </Table.Header>
        <Table.Body className="fs-md">
          {gsbList.map((gsb) => (
            <Table.ClickRow
              key={`${gsb.key.category}-${gsb.key.number}`}
              id={`region-${formatNumber(gsb)}`}
              active={state.gsbSelected?.category === gsb.key.category && state.gsbSelected.number === gsb.key.number}
              onClick={() => void selectGSB(gsb)}
            >
              <Table.NumberCell>
                <strong>{formatNumber(gsb)}</strong>
              </Table.NumberCell>
              <Table.Cell className="break-word">{gsb.name}</Table.Cell>
            </Table.ClickRow>
          ))}
        </Table.Body>
      </Table>
    </section>
  );
}
