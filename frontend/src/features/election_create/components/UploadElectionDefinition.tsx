import { ReactElement, useState } from "react";

import { ApiError, isError, isSuccess } from "@/api/ApiResult";
import { useCrud } from "@/api/useCrud";
import { Alert } from "@/components/ui/Alert/Alert";
import { FileInput } from "@/components/ui/FileInput/FileInput";
import { t, tx } from "@/i18n/translate";
import { ELECTION_IMPORT_VALIDATE_REQUEST_PATH, ElectionDefinitionUploadResponse } from "@/types/generated/openapi";

import { useElectionCreateContext } from "../hooks/useElectionCreateContext";
import { CheckElectionDefinition } from "./CheckElectionDefinition";

export function UploadElectionDefinition() {
  const { file, setFile, data, setData } = useElectionCreateContext();
  const path: ELECTION_IMPORT_VALIDATE_REQUEST_PATH = `/api/elections/validate`;
  const [error, setError] = useState<ReactElement | undefined>();
  const { create } = useCrud<ElectionDefinitionUploadResponse>({ create: path });

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const currentFile = e.target.files ? e.target.files[0] : undefined;
    setFile(currentFile);
    if (currentFile !== undefined) {
      const response = await create({ data: await currentFile.text() });

      if (isSuccess(response)) {
        setData(response.data);
        setError(undefined);
      } else if (isError(response)) {
        setData(undefined);
        setFile(undefined);

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
  };

  if (file && data) {
    return <CheckElectionDefinition file={file} data={data} />;
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
      <FileInput id="upload-eml" onChange={(e) => void onFileChange(e)} file={file}>
        {t("select_file")}
      </FileInput>
    </section>
  );
}
