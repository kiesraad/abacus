import { ChangeEvent, ReactNode, useState } from "react";
import { Navigate, useNavigate } from "react-router";

import { ApiError, isError, isSuccess } from "@/api/ApiResult";
import { useCrud } from "@/api/useCrud";
import { Alert } from "@/components/ui/Alert/Alert";
import { FileInput } from "@/components/ui/FileInput/FileInput";
import { Form } from "@/components/ui/Form/Form";
import { FormLayout } from "@/components/ui/Form/FormLayout";
import { t, tx } from "@/i18n/translate";
import { ELECTION_IMPORT_VALIDATE_REQUEST_PATH, ElectionDefinitionValidateResponse } from "@/types/generated/openapi";

import { useElectionCreateContext } from "../hooks/useElectionCreateContext";
import { CheckHash } from "./CheckHash";

export function UploadCandidatesDefinition() {
  const { state, dispatch } = useElectionCreateContext();
  const navigate = useNavigate();

  const path: ELECTION_IMPORT_VALIDATE_REQUEST_PATH = `/api/elections/import/validate`;
  const [error, setError] = useState<ReactNode | undefined>();
  const [file, setFile] = useState<File | undefined>();
  const { create } = useCrud<ElectionDefinitionValidateResponse>({ create: path });

  // if no election data was stored, navigate back to beginning
  if (!state.electionDefinitionData) {
    return <Navigate to="/elections/create" />;
  }

  async function onFileChange(e: ChangeEvent<HTMLInputElement>) {
    const currentFile = e.target.files ? e.target.files[0] : undefined;
    if (currentFile !== undefined) {
      const data = await currentFile.text();
      const response = await create({
        candidate_data: data,
        election_hash: state.electionDefinitionHash,
        election_data: state.electionDefinitionData,
      });

      if (isSuccess(response)) {
        setFile(undefined);
        dispatch({
          type: "SELECT_CANDIDATES_DEFINITION",
          response: response.data,
          candidateDefinitionData: data,
          candidateDefinitionFileName: currentFile.name,
        });
        setError(undefined);
      } else if (isError(response)) {
        setFile(currentFile);
        // Response code 413 indicates that the file is too large
        if (response instanceof ApiError && response.code === 413) {
          setError(
            tx(
              "election.invalid_candidates_definition.file_too_large",
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
            tx("election.invalid_candidates_definition.description", {
              file: () => <strong>{currentFile.name}</strong>,
            }),
          );
        }
      }
    }
  }

  if (
    state.election &&
    state.candidateDefinitionFileName &&
    state.candidateDefinitionRedactedHash &&
    state.candidateDefinitionData &&
    !state.candidateDefinitionHash
  ) {
    async function onSubmit(chunks: string[]) {
      const response = await create({
        candidate_data: state.candidateDefinitionData,
        election_hash: state.electionDefinitionHash,
        election_data: state.electionDefinitionData,
        candidate_hash: chunks,
      });
      if (isSuccess(response)) {
        dispatch({
          type: "SET_CANDIDATES_DEFINITION_HASH",
          candidateDefinitionHash: chunks,
        });
        await navigate("/elections/create/polling-stations");
      } else if (isError(response) && response instanceof ApiError && response.reference === "InvalidHash") {
        setError(response.message);
      }
    }

    return (
      <CheckHash
        date={state.election.election_date}
        title={t("election.check_eml.list_name", {
          location: state.election.location,
          name: state.election.election_id,
        })}
        header={t("election.check_eml.candidates_title")}
        description={tx("election.check_eml.candidates_description", {
          file: () => {
            return <strong>{state.candidateDefinitionFileName}</strong>;
          },
        })}
        redactedHash={state.candidateDefinitionRedactedHash}
        error={error}
        onSubmit={(chunks) => void onSubmit(chunks)}
      />
    );
  }

  return (
    <section className="md">
      <Form title={t("election.import_candidates_eml")}>
        <FormLayout>
          <FormLayout.Section>
            {error && (
              <Alert type="error" title={t("election.invalid_candidates_definition.title")} inline>
                <p>{error}</p>
              </Alert>
            )}

            <p>{t("election.use_instructions_to_import_candidates_eml")}</p>
            <FileInput id="upload-eml" file={error ? file : undefined} onChange={(e) => void onFileChange(e)}>
              {t("select_file")}
            </FileInput>
          </FormLayout.Section>
        </FormLayout>
      </Form>
    </section>
  );
}
