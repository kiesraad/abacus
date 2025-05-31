import { ReactNode, useState } from "react";
import { useNavigate } from "react-router";

import { ApiError, isError, isSuccess } from "@/api/ApiResult";
import { useCrud } from "@/api/useCrud";
import { Alert } from "@/components/ui/Alert/Alert";
import { FileInput } from "@/components/ui/FileInput/FileInput";
import { t, tx } from "@/i18n/translate";
import { ELECTION_IMPORT_VALIDATE_REQUEST_PATH, ElectionDefinitionValidateResponse } from "@/types/generated/openapi";

import { useElectionCreateContext } from "../hooks/useElectionCreateContext";
import { CheckHash } from "./CheckHash";

export function UploadElectionDefinition() {
  const { state, dispatch } = useElectionCreateContext();
  const navigate = useNavigate();
  const path: ELECTION_IMPORT_VALIDATE_REQUEST_PATH = `/api/elections/import/validate`;
  const [error, setError] = useState<ReactNode | undefined>();
  const { create } = useCrud<ElectionDefinitionValidateResponse>({ create: path });

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const currentFile = e.target.files ? e.target.files[0] : undefined;
    if (currentFile !== undefined) {
      const data = await currentFile.text();
      const response = await create({ data });

      if (isSuccess(response)) {
        dispatch({
          type: "SELECT_ELECTION_DEFINITION",
          response: response.data,
          electionDefinitionData: data,
          electionDefinitionFileName: currentFile.name,
        });
        setError(undefined);
      } else if (isError(response)) {
        // Response code 413 indicates that the file is too large
        if (response instanceof ApiError && response.code === 413) {
          setError(
            tx(
              "election.invalid_election_definition.file_too_large",
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
            tx("election.invalid_election_definition.description", {
              file: () => <strong>{currentFile.name}</strong>,
            }),
          );
        }
      }
    }
  }

  if (
    state.election &&
    state.electionDefinitionFileName &&
    state.electionDefinitionRedactedHash &&
    state.electionDefinitionData
  ) {
    async function onSubmit(chunks: string[]) {
      const response = await create({ data: state.electionDefinitionData, hash: chunks });
      if (isSuccess(response)) {
        dispatch({
          type: "SET_ELECTION_DEFINITION_HASH",
          electionDefinitionHash: chunks,
        });
        await navigate("/elections/create/check-and-save");
      } else if (isError(response) && response instanceof ApiError && response.reference === "InvalidHash") {
        setError(response.message);
      }
    }

    return (
      <CheckHash
        date={state.election.election_date}
        title={state.election.name}
        fileName={state.electionDefinitionFileName}
        redactedHash={state.electionDefinitionRedactedHash}
        error={error}
        onSubmit={(chunks) => void onSubmit(chunks)}
      />
    );
  }

  return (
    <section className="md">
      <h2>{t("election.import_eml")}</h2>
      <div className="mt-lg mb-lg">
        {error && (
          <Alert type="error" title={t("election.invalid_election_definition.title")} inline>
            <p>{error}</p>
          </Alert>
        )}
      </div>
      <p className="mb-lg">{t("election.use_instructions_to_import_eml")}</p>
      <FileInput id="upload-eml" onChange={(e) => void onFileChange(e)}>
        {t("select_file")}
      </FileInput>
    </section>
  );
}
