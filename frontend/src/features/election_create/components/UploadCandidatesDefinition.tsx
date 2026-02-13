import { type ChangeEvent, type ReactNode, useState } from "react";
import { Navigate, useNavigate } from "react-router";

import { ApiError, isError, isSuccess } from "@/api/ApiResult";
import { useCrud } from "@/api/useCrud";
import { Alert } from "@/components/ui/Alert/Alert";
import { FileInput } from "@/components/ui/FileInput/FileInput";
import { Form } from "@/components/ui/Form/Form";
import { FormLayout } from "@/components/ui/Form/FormLayout";
import { t, tx } from "@/i18n/translate";
import type {
  ELECTION_IMPORT_VALIDATE_REQUEST_PATH,
  ElectionDefinitionValidateResponse,
} from "@/types/generated/openapi";
import { fileTooLargeError, isFileTooLarge } from "@/utils/uploadFileSize";

import { useElectionCreateContext } from "../hooks/useElectionCreateContext";
import { CheckHash } from "./CheckHash";

// biome-ignore lint/complexity/noExcessiveLinesPerFunction: TODO function should be refactored
export function UploadCandidatesDefinition() {
  const { state, dispatch } = useElectionCreateContext();
  const navigate = useNavigate();
  const [error, setError] = useState<ReactNode | undefined>();
  const [file, setFile] = useState<File | undefined>();
  const createPath: ELECTION_IMPORT_VALIDATE_REQUEST_PATH = `/api/elections/import/validate`;
  const { create } = useCrud<ElectionDefinitionValidateResponse>({ createPath });

  // if no election data was stored, navigate back to beginning
  if (!state.electionDefinitionData) {
    return <Navigate to="/elections/create" />;
  }

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: TODO function should be refactored
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
        GSB: {
          election_and_candidates: {
            election_data: state.electionDefinitionData,
            election_hash: state.electionDefinitionHash,
            candidate_data: data,
          },
          gsb: {},
        },
      });

      if (isSuccess(response)) {
        dispatch({
          type: "SELECT_CANDIDATES_DEFINITION",
          response: response.data,
          candidateDefinitionData: data,
          candidateDefinitionFileName: currentFile.name,
        });
        setError(undefined);
      } else if (isError(response)) {
        // Response code 413 indicates that the file is too large
        if (response instanceof ApiError && response.code === 413) {
          setError(fileTooLargeError(currentFile));
        } else {
          setError(
            tx("election.invalid_candidates_definition.description", {
              file: () => <strong>{currentFile.name}</strong>,
            }),
          );
        }
      }
    } else {
      setFile(undefined);
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
        GSB: {
          election_and_candidates: {
            election_data: state.electionDefinitionData,
            election_hash: state.electionDefinitionHash,
            candidate_data: state.candidateDefinitionData,
            candidate_hash: chunks,
          },
          gsb: {},
        },
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
            <FileInput id="upload-eml" file={file} onChange={(e) => void onFileChange(e)}>
              {t("select_file")}
            </FileInput>
          </FormLayout.Section>
        </FormLayout>
      </Form>
    </section>
  );
}
