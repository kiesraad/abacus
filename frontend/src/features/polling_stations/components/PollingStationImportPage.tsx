import { ReactNode, useState } from "react";
import { useNavigate } from "react-router";

import { ApiError, isError, isSuccess } from "@/api/ApiResult";
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
  PollingStationListResponse,
  PollingStationRequest,
  PollingStationRequestListResponse,
} from "@/types/generated/openapi";

export function PollingStationImportPage() {
  const { election } = useElection();
  const { pushMessage } = useMessages();
  const navigate = useNavigate();

  const [error, setError] = useState<ReactNode | undefined>();
  const [pollingStations, setPollingStations] = useState<PollingStationRequest[]>([]);
  const [pollingStationFileName, setPollingStationFileName] = useState<string | undefined>(undefined);

  const parentUrl = `/elections/${election.id}/polling-stations`;
  const validatePath = `/api/elections/${election.id}/polling_stations/validate-import`;
  const importPath = `/api/elections/${election.id}/polling_stations/import`;

  const postImport = useCrud<PollingStationListResponse>({ create: importPath }).create;
  const postValidate = useCrud<PollingStationRequestListResponse>({ create: validatePath }).create;

  /**
   * Import the polling stations
   */
  async function importPollingStations() {
    const response = await postImport({ file_name: pollingStationFileName, polling_stations: pollingStations });

    if (isSuccess(response)) {
      pushMessage({
        title: t("polling_station.message.polling_stations_imported", {
          number: response.data.polling_stations.length,
        }),
      });
      void navigate(parentUrl);
    } else if (isError(response)) {
      setError(response.message);
    }
  }

  /**
   * When a file is uploaded, backend validate the contents
   */
  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const currentFile = e.target.files ? e.target.files[0] : undefined;
    if (currentFile !== undefined) {
      const data = await currentFile.text();
      const response = await postValidate({ data });

      if (isSuccess(response)) {
        setPollingStationFileName(currentFile.name);
        setPollingStations(response.data.polling_stations);
        setError(undefined);
      } else if (isError(response)) {
        setPollingStations([]);
        setPollingStationFileName(undefined);

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
            <FileInput id="upload-eml" onChange={(e) => void onFileChange(e)}>
              {t("select_file")}
            </FileInput>
          </FormLayout.Controls>
        </FormLayout.Section>
      </FormLayout>
    </Form>
  );

  // Show polling stations and import button
  if (pollingStations.length > 0) {
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
                file: () => <strong>{pollingStationFileName}</strong>,
              })}
            </p>

            <PollingStationsPreview pollingStations={pollingStations} />
          </FormLayout.Section>
          <FormLayout.Controls>
            <Button type="button" onClick={() => void importPollingStations()}>
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
      <main>
        <article>{content}</article>
      </main>
    </>
  );
}
