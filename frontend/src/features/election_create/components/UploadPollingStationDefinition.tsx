import { ChangeEvent, ReactNode, useState } from "react";
import { Navigate, useNavigate } from "react-router";

import { ApiError, isError, isSuccess } from "@/api/ApiResult";
import { useCrud } from "@/api/useCrud";
import { PollingStationsPreview } from "@/components/polling_station/PollingStationsPreview";
import { Alert } from "@/components/ui/Alert/Alert";
import { Button } from "@/components/ui/Button/Button";
import { FileInput } from "@/components/ui/FileInput/FileInput";
import { Form } from "@/components/ui/Form/Form";
import { FormLayout } from "@/components/ui/Form/FormLayout";
import { t, tx } from "@/i18n/translate";
import { ELECTION_IMPORT_VALIDATE_REQUEST_PATH, ElectionDefinitionValidateResponse } from "@/types/generated/openapi";

import { useElectionCreateContext } from "../hooks/useElectionCreateContext";
import { fileTooLargeError, isFileTooLarge } from "../utils/uploadFileSize";

export function UploadPollingStationDefinition() {
  const { state, dispatch } = useElectionCreateContext();
  const navigate = useNavigate();
  const [error, setError] = useState<ReactNode | undefined>();
  const [file, setFile] = useState<File | undefined>();
  const createPath: ELECTION_IMPORT_VALIDATE_REQUEST_PATH = `/api/elections/import/validate`;
  const { create } = useCrud<ElectionDefinitionValidateResponse>({ createPath });

  // if no data was stored, navigate back to beginning
  if (!state.electionDefinitionData) {
    return <Navigate to="/elections/create" />;
  }

  async function skip() {
    await navigate("/elections/create/counting-method-type");
  }

  async function onFileChange(e: ChangeEvent<HTMLInputElement>) {
    const currentFile = e.target.files ? e.target.files[0] : undefined;
    if (currentFile !== undefined) {
      if (await isFileTooLarge(currentFile)) {
        setError(fileTooLargeError(currentFile));
        return;
      }

      setFile(currentFile);
      const data = await currentFile.text();
      const response = await create({
        election_hash: state.electionDefinitionHash,
        election_data: state.electionDefinitionData,
        candidate_hash: state.candidateDefinitionHash,
        candidate_data: state.candidateDefinitionData,
        polling_station_data: data,
        polling_station_file_name: currentFile.name,
      });

      if (isSuccess(response)) {
        dispatch({
          type: "SELECT_POLLING_STATION_DEFINITION",
          response: response.data,
          pollingStationDefinitionData: data,
          pollingStationDefinitionFileName: currentFile.name,
          pollingStationDefinitionMatchesElection: response.data.polling_station_definition_matches_election,
        });
        setError(undefined);
      } else if (isError(response)) {
        // Response code 413 indicates that the file is too large
        if (response instanceof ApiError && response.code === 413) {
          setError(fileTooLargeError(currentFile));
        } else {
          setError(
            tx("election.invalid_polling_station_definition.description", {
              file: () => <strong>{currentFile.name}</strong>,
            }),
          );
        }
      }
    } else {
      setFile(undefined);
    }
  }

  if (state.pollingStations && state.pollingStationDefinitionFileName && state.pollingStationDefinitionData) {
    async function next() {
      await navigate("/elections/create/counting-method-type");
    }

    return (
      <section className="md">
        <Form title={t("election.polling_stations.check.title")}>
          <FormLayout>
            <FormLayout.Section>
              {state.pollingStationDefinitionMatchesElection === false && (
                <Alert
                  type="warning"
                  title={t("election.polling_station_definition_does_not_match_election.title")}
                  inline
                >
                  <p>
                    {tx("election.polling_station_definition_does_not_match_election.description", {
                      file: () => <strong>{state.pollingStationDefinitionFileName}</strong>,
                    })}
                  </p>
                </Alert>
              )}
              <p>
                {tx("election.polling_stations.check.description", {
                  file: () => <strong>{state.pollingStationDefinitionFileName}</strong>,
                })}
              </p>
              <PollingStationsPreview pollingStations={state.pollingStations} />
            </FormLayout.Section>
            <FormLayout.Controls>
              <Button type="button" onClick={() => void next()}>
                {t("next")}
              </Button>
            </FormLayout.Controls>
          </FormLayout>
        </Form>
      </section>
    );
  }

  return (
    <section className="md">
      <Form
        title={state.election ? t("election.import_polling_station_eml", { location: state.election.location }) : ""}
      >
        <FormLayout>
          <FormLayout.Section>
            {error && (
              <Alert type="error" title={t("election.invalid_polling_station_definition.title")} inline>
                <p>{error}</p>
              </Alert>
            )}
            <p>{t("election.use_instructions_to_import_polling_stations_eml")}</p>
            <FileInput id="upload-eml" file={file} onChange={(e) => void onFileChange(e)}>
              {t("select_file")}
            </FileInput>

            <FormLayout.Controls>
              <Button type="button" variant="underlined" size="md" onClick={() => void skip()}>
                {t("election.polling_stations.skip_step")}
              </Button>
            </FormLayout.Controls>
          </FormLayout.Section>
        </FormLayout>
      </Form>
    </section>
  );
}
