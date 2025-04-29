import { useState } from "react";
import { useNavigate } from "react-router";

import { isError, isSuccess } from "@/api/ApiResult";
import { useCrud } from "@/api/useCrud";
import { Alert } from "@/components/ui/Alert/Alert";
import { FileInput } from "@/components/ui/FileInput/FileInput";
import { t, tx } from "@/lib/i18n";
import { ELECTION_IMPORT_VALIDATE_REQUEST_PATH, ElectionDefinitionUploadResponse } from "@/types/generated/openapi";

import { useElectionCreateContext } from "../hooks/useElectionCreateContext";

export function UploadElectionDefinition() {
  const { file, setFile, setData } = useElectionCreateContext();
  const navigate = useNavigate();
  const path: ELECTION_IMPORT_VALIDATE_REQUEST_PATH = `/api/elections/validate`;
  const [error, setError] = useState<string | undefined>();
  const { create } = useCrud<ElectionDefinitionUploadResponse>({ create: path });

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const currentFile = e.target.files ? e.target.files[0] : undefined;
    setFile(currentFile);
    if (currentFile !== undefined) {
      const response = await create({ data: await currentFile.text() });
      if (isSuccess(response)) {
        setData(response.data);
        setError(undefined);
        navigate("/elections/create/check-definition");
      } else if (isError(response)) {
        setData(undefined);
        setError(currentFile.name);
        setFile(undefined);
      }
    }
  };

  return (
    <section className="md">
      <h2>{t("election.import_eml")}</h2>
      <div className="mt-lg mb-lg">
        {error && (
          <Alert type="error" title={t("election.invalid_election_definition.title")} inline>
            <p>
              {tx("election.invalid_election_definition.description", {
                file: () => {
                  return <strong>{error}</strong>;
                },
              })}
            </p>
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
