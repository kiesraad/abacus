import { ReactNode, useState } from "react";
import { Navigate, useNavigate } from "react-router";

import { ApiError, isError, isSuccess } from "@/api/ApiResult";
import { useCrud } from "@/api/useCrud";
import { Alert } from "@/components/ui/Alert/Alert";
import { Button } from "@/components/ui/Button/Button";
import { FileInput } from "@/components/ui/FileInput/FileInput";
import { Table } from "@/components/ui/Table/Table";
import { t, tx } from "@/i18n/translate";
import {
  ELECTION_IMPORT_VALIDATE_REQUEST_PATH,
  ElectionDefinitionValidateResponse,
  PollingStationRequest,
} from "@/types/generated/openapi";

import { useElectionCreateContext } from "../hooks/useElectionCreateContext";
import cls from "./UploadPollingStationDefinition.module.css";

export function UploadPollingStationDefinition() {
  const { state, dispatch } = useElectionCreateContext();
  const navigate = useNavigate();

  const path: ELECTION_IMPORT_VALIDATE_REQUEST_PATH = `/api/elections/import/validate`;
  const [error, setError] = useState<ReactNode | undefined>();
  const [showAllPollingPlaces, setShowAllPollingPlaces] = useState<boolean>(false);

  const { create } = useCrud<ElectionDefinitionValidateResponse>({ create: path });

  // if no data was stored, navigate back to beginning
  if (!state.electionDefinitionData) {
    return <Navigate to="/elections/create" />;
  }

  async function skip() {
    await navigate("/elections/create/check-and-save");
  }

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const currentFile = e.target.files ? e.target.files[0] : undefined;
    if (currentFile !== undefined) {
      const data = await currentFile.text();
      const response = await create({
        election_hash: state.electionDefinitionHash,
        election_data: state.electionDefinitionData,
        candidate_hash: state.candidateDefinitionHash,
        candidate_data: state.candidateDefinitionData,
        polling_station_data: data,
      });

      if (isSuccess(response)) {
        dispatch({
          type: "SELECT_POLLING_STATION_DEFINITION",
          response: response.data,
          pollingStationDefinitionData: data,
          pollingStationDefinitionFileName: currentFile.name,
        });
        setError(undefined);
      } else if (isError(response)) {
        // Response code 413 indicates that the file is too large
        if (response instanceof ApiError && response.code === 413) {
          setError(
            tx(
              "election.invalid_polling_station_definition.file_too_large",
              {
                file: () => <strong>{currentFile.name}</strong>,
              },
              {
                max_size: response.message,
              },
            ),
          );
        } else {
          setError(
            tx("election.invalid_polling_station_definition.description", {
              file: () => <strong>{currentFile.name}</strong>,
            }),
          );
        }
      }
    }
  }

  if (state.pollingStations && state.pollingStationDefinitionFileName && state.pollingStationDefinitionData) {
    async function next() {
      await navigate("/elections/create/check-and-save");
    }

    function showAll() {
      setShowAllPollingPlaces(true);
    }

    return (
      <section className="md">
        <h2>{t("election.polling_stations.check.title")}</h2>
        <p className="mb-lg">
          {tx("election.polling_stations.check.description", {
            file: () => <strong>{state.pollingStationDefinitionFileName}</strong>,
          })}
        </p>

        {(showAllPollingPlaces || state.pollingStations.length <= 10) && (
          <Table className={"table"} id="overview">
            <Table.Body>
              {state.pollingStations.map((pollingStation: PollingStationRequest) => (
                <Table.Row key={pollingStation.number}>
                  <Table.NumberCell className="font-number">{pollingStation.number}</Table.NumberCell>
                  <Table.Cell>{pollingStation.name}</Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        )}

        {!showAllPollingPlaces && state.pollingStations.length > 10 && (
          <>
            <Table className={"table"} id="overview">
              <Table.Body>
                {state.pollingStations.slice(0, 10).map((pollingStation: PollingStationRequest) => (
                  <Table.Row key={pollingStation.number}>
                    <Table.NumberCell className="font-number">{pollingStation.number}</Table.NumberCell>
                    <Table.Cell>{pollingStation.name}</Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
            <p className="mt-lg">
              <button id="show-more" className={cls.link} onClick={showAll}>
                {t("election.polling_stations.show_all", { num: state.pollingStations.length })}
              </button>
            </p>
          </>
        )}

        <div className="mt-xl">
          <Button onClick={() => void next()}>{t("next")}</Button>
        </div>
      </section>
    );
  }

  return (
    <section className="md">
      {state.election && (
        <h2>
          {t("election.import_polling_station_eml", {
            location: state.election.location,
          })}
        </h2>
      )}
      <div className="mt-lg mb-lg">
        {error && (
          <Alert type="error" title={t("election.invalid_polling_station_definition.title")} inline>
            <p>{error}</p>
          </Alert>
        )}
      </div>
      <p className="mb-lg">{t("election.use_instructions_to_import_polling_stations_eml")}</p>
      <FileInput id="upload-eml" onChange={(e) => void onFileChange(e)}>
        {t("select_file")}
      </FileInput>

      <p className="mt-lg">
        <button className={cls.link} onClick={() => void skip()}>
          {t("election.polling_stations.skip_step")}
        </button>
      </p>
    </section>
  );
}
