import { ReactNode, useState } from "react";
import { useNavigate } from "react-router";

import { ApiError, isError, isSuccess } from "@/api/ApiResult";
import { useCrud } from "@/api/useCrud";
import { PageTitle } from "@/components/page_title/PageTitle";
import { Alert } from "@/components/ui/Alert/Alert";
import { Button } from "@/components/ui/Button/Button";
import { FileInput } from "@/components/ui/FileInput/FileInput";
import { Table } from "@/components/ui/Table/Table";
import { useElection } from "@/hooks/election/useElection";
import { useMessages } from "@/hooks/messages/useMessages";
import { t, tx } from "@/i18n/translate";
import {
  PollingStationListResponse,
  PollingStationRequest,
  PollingStationRequestListResponse,
} from "@/types/generated/openapi";

import cls from "./PollingStationImportPage.module.css";

export function PollingStationImportPage() {
  const { election } = useElection();
  const { pushMessage } = useMessages();
  const navigate = useNavigate();

  const [error, setError] = useState<ReactNode | undefined>();
  const [pollingStations, setPollingStations] = useState<PollingStationRequest[]>([]);
  const [pollingStationFileName, setPollingStationFileName] = useState<string | undefined>(undefined);
  const [showAllPollingPlaces, setShowAllPollingPlaces] = useState<boolean>(false);

  const parentUrl = `/elections/${election.id}/polling-stations`;
  const validatePath = `/api/elections/${election.id}/polling_stations/validate-import`;
  const importPath = `/api/elections/${election.id}/polling_stations/import`;

  const postImport = useCrud<PollingStationRequestListResponse>({ create: importPath }).create;
  const postValidate = useCrud<PollingStationListResponse>({ create: validatePath }).create;

  function showAll() {
    setShowAllPollingPlaces(true);
  }

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
    <>
      <h2>{t("polling_station.import_subtitle", { location: election.location })}</h2>

      {error && (
        <div className="mt-lg mb-lg">
          <Alert type="error" title={t("election.invalid_polling_station_definition.title")} inline>
            <span>{error}</span>
          </Alert>
        </div>
      )}

      <p className="mb-lg">{t("election.use_instructions_to_import_polling_stations_eml")}</p>
      <FileInput id="upload-eml" onChange={(e) => void onFileChange(e)}>
        {t("select_file")}
      </FileInput>
    </>
  );

  // Show polling stations and import button
  if (pollingStations.length > 0) {
    content = (
      <>
        <h2>{t("election.polling_stations.check.title")}</h2>

        {error && (
          <div className="mt-lg mb-lg">
            <Alert type="error" title={t("election.invalid_polling_station_definition.title")} inline>
              <span>{error}</span>
            </Alert>
          </div>
        )}

        <p className="mb-lg">
          {tx("election.polling_stations.check.description", {
            file: () => <strong>{pollingStationFileName}</strong>,
          })}
        </p>

        {(showAllPollingPlaces || pollingStations.length <= 10) && (
          <Table className={"table"} id="overview">
            <Table.Body>
              {pollingStations.map((pollingStation: PollingStationRequest) => (
                <Table.Row key={pollingStation.number}>
                  <Table.NumberCell className="font-number">{pollingStation.number}</Table.NumberCell>
                  <Table.Cell>{pollingStation.name}</Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        )}

        {!showAllPollingPlaces && pollingStations.length > 10 && (
          <>
            <Table className={"table"} id="overview">
              <Table.Body>
                {pollingStations.slice(0, 10).map((pollingStation: PollingStationRequest) => (
                  <Table.Row key={pollingStation.number}>
                    <Table.NumberCell className="font-number">{pollingStation.number}</Table.NumberCell>
                    <Table.Cell>{pollingStation.name}</Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
            <p className="mt-lg">
              <button id="show-more" className={cls.linkButton} onClick={showAll}>
                {t("election.polling_stations.show_all", { num: pollingStations.length })}
              </button>
            </p>
          </>
        )}

        <div className="mt-xl">
          <Button onClick={() => void importPollingStations()}>{t("polling_station.import")}</Button>
        </div>
      </>
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
