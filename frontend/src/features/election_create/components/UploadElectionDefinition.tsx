import { ChangeEvent, ReactNode, useState } from "react";
import { useNavigate } from "react-router";

import { ApiError, isError, isSuccess } from "@/api/ApiResult";
import { useCrud } from "@/api/useCrud";
import { Alert } from "@/components/ui/Alert/Alert";
import { FileInput } from "@/components/ui/FileInput/FileInput";
import { Form } from "@/components/ui/Form/Form";
import { FormLayout } from "@/components/ui/Form/FormLayout";
import { t, tx } from "@/i18n/translate";
import { ELECTION_IMPORT_VALIDATE_REQUEST_PATH, ElectionDefinitionValidateResponse } from "@/types/generated/openapi";

import { useElectionCreateContext } from "../hooks/useElectionCreateContext";
import { fileTooLargeError, isFileTooLarge } from "../utils/uploadFileSize";
import { CheckHash } from "./CheckHash";

export function UploadElectionDefinition() {
  const { state, dispatch } = useElectionCreateContext();
  const navigate = useNavigate();
  const [error, setError] = useState<ReactNode | undefined>();
  const [file, setFile] = useState<File | undefined>();
  const createPath: ELECTION_IMPORT_VALIDATE_REQUEST_PATH = `/api/elections/import/validate`;
  const { create } = useCrud<ElectionDefinitionValidateResponse>({ createPath });

  async function onFileChange(e: ChangeEvent<HTMLInputElement>) {
    const currentFile = e.target.files ? e.target.files[0] : undefined;
    if (currentFile !== undefined) {
      if (await isFileTooLarge(currentFile)) {
        setError(fileTooLargeError(currentFile));
        return;
      }

      setFile(currentFile);
      const data = await currentFile.text();
      const response = await create({ election_data: data });

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
          setError(fileTooLargeError(currentFile));
        } else {
          setError(
            tx("election.invalid_election_definition.description", {
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
    state.electionDefinitionFileName &&
    state.electionDefinitionRedactedHash &&
    state.electionDefinitionData &&
    !state.electionDefinitionHash
  ) {
    async function onSubmit(chunks: string[]) {
      const response = await create({ election_data: state.electionDefinitionData, election_hash: chunks });
      if (isSuccess(response)) {
        dispatch({
          type: "SET_ELECTION_DEFINITION_HASH",
          electionDefinitionHash: chunks,
        });
        await navigate("/elections/create/polling-station-role");
      } else if (isError(response) && response instanceof ApiError && response.reference === "InvalidHash") {
        setError(response.message);
      }
    }

    return (
      <CheckHash
        date={state.election.election_date}
        title={state.election.name}
        header={t("election.check_eml.election_title")}
        description={tx("election.check_eml.election_description", {
          file: () => {
            return <strong>{state.electionDefinitionFileName}</strong>;
          },
        })}
        redactedHash={state.electionDefinitionRedactedHash}
        error={error}
        onSubmit={(chunks) => void onSubmit(chunks)}
      />
    );
  }

  return (
    <section className="md">
      <Form title={t("election.import_election_eml")}>
        <FormLayout>
          <FormLayout.Section>
            {error && (
              <Alert type="error" title={t("election.invalid_election_definition.title")} inline>
                <p>{error}</p>
              </Alert>
            )}

            <p>{t("election.use_instructions_to_import_eml")}</p>

            <FileInput id="upload-eml" file={file} onChange={(e) => void onFileChange(e)}>
              {t("select_file")}
            </FileInput>
          </FormLayout.Section>
        </FormLayout>
      </Form>
    </section>
  );
}
