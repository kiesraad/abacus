import { ChangeEvent, ReactNode, useState } from "react";
import { useNavigate } from "react-router";

import { ApiError, isSuccess } from "@/api/ApiResult";
import { useCrud } from "@/api/useCrud";
import { PageTitle } from "@/components/page_title/PageTitle";
import { PollingStationsPreview } from "@/components/polling_station/PollingStationsPreview";
import { Alert } from "@/components/ui/Alert/Alert";
import { Button } from "@/components/ui/Button/Button";
import { FileInput } from "@/components/ui/FileInput/FileInput";
import { Form } from "@/components/ui/Form/Form";
import { FormLayout } from "@/components/ui/Form/FormLayout";
import { useElection } from "@/hooks/election/useElection";
import { useMessages } from "@/hooks/messages/useMessages";
import { t, tx } from "@/i18n/translate";
import {
  POLLING_STATION_IMPORT_REQUEST_PATH,
  POLLING_STATION_VALIDATE_IMPORT_REQUEST_PATH,
  PollingStationListResponse,
  PollingStationRequest,
  PollingStationRequestListResponse,
} from "@/types/generated/openapi";
import { MAX_FILE_UPLOAD_SIZE_MB } from "@/utils/fileUpload";

import { PollingStationAlert } from "./PollingStationAlert";

export function PollingStationImportPage() {
  const { election } = useElection();
  const { pushMessage } = useMessages();
  const navigate = useNavigate();

  const [error, setError] = useState<ReactNode | undefined>();
  const [file, setFile] = useState<File | undefined>();
  const [pollingStations, setPollingStations] = useState<PollingStationRequest[]>([]);

  const parentUrl = `/elections/${election.id}/polling-stations`;
  const validatePath: POLLING_STATION_VALIDATE_IMPORT_REQUEST_PATH = `/api/elections/${election.id}/polling_stations/validate-import`;
  const importPath: POLLING_STATION_IMPORT_REQUEST_PATH = `/api/elections/${election.id}/polling_stations/import`;
  const { create: postImport } = useCrud<PollingStationListResponse>({ createPath: importPath });
  const { create: postValidate } = useCrud<PollingStationRequestListResponse>({ createPath: validatePath });

  /**
   * Import the polling stations
   */
  async function importPollingStations(pollingStationsFileName: string) {
    const response = await postImport({ file_name: pollingStationsFileName, polling_stations: pollingStations });

    if (isSuccess(response)) {
      pushMessage({
        title: t("polling_station.message.polling_stations_imported", {
          number: response.data.polling_stations.length,
        }),
      });
      void navigate(parentUrl);
    } else {
      setError(response.message);
    }
  }

  /**
   * When a file is uploaded, backend validate the contents
   */
  async function onFileChange(e: ChangeEvent<HTMLInputElement>) {
    const currentFile = e.target.files ? e.target.files[0] : undefined;
    if (currentFile !== undefined) {
      setFile(currentFile);
      const data = await currentFile.text();
      const response = await postValidate({ data });

      if (isSuccess(response)) {
        setPollingStations(response.data.polling_stations);
        setError(undefined);
      } else {
        setPollingStations([]);

        // Response code 413 indicates that the file is too large
        if (response instanceof ApiError && response.code === 413) {
          setError(
            tx(
              "file_too_large",
              {
                file: () => <strong>{currentFile.name}</strong>,
              },
              {
                max_size: MAX_FILE_UPLOAD_SIZE_MB,
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
    } else {
      setFile(undefined);
    }
  }

  // Show file upload button
  let content = (
    <Form title={t("polling_station.import_subtitle", { location: election.location })}>
      <FormLayout>
        <FormLayout.Section>
          {error && (
            <Alert type="error" title={t("election.invalid_polling_station_definition.title")} inline>
              <span>{error}</span>
            </Alert>
          )}

          <p>{t("polling_station.import_instructions")}</p>

          <FormLayout.Controls>
            <FileInput id="upload-eml" file={file} onChange={(e) => void onFileChange(e)}>
              {t("select_file")}
            </FileInput>
          </FormLayout.Controls>
        </FormLayout.Section>
      </FormLayout>
    </Form>
  );

  // Show polling stations and import button
  if (pollingStations.length > 0 && file) {
    content = (
      <Form title={t("election.polling_stations.check.title")}>
        <FormLayout>
          <FormLayout.Section>
            {error && (
              <Alert type="error" title={t("election.invalid_polling_station_definition.title")} inline>
                <span>{error}</span>
              </Alert>
            )}

            <p>
              {tx("election.polling_stations.check.description", {
                file: () => <strong>{file.name}</strong>,
              })}
            </p>

            <PollingStationsPreview pollingStations={pollingStations} />
          </FormLayout.Section>
          <FormLayout.Controls>
            <Button type="button" onClick={() => void importPollingStations(file.name)}>
              {t("polling_station.import")}
            </Button>
          </FormLayout.Controls>
        </FormLayout>
      </Form>
    );
  }

  return (
    <>
      <PageTitle title={`${t("polling_station.title.plural")} - Abacus`} />
      <header>
        <section>
          <h1>{t("polling_station.import")}</h1>
        </section>
      </header>
      <PollingStationAlert />
      <main>
        <article>{content}</article>
      </main>
    </>
  );
}
