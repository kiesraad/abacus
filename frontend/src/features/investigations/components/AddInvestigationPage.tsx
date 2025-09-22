import { PageTitle } from "@/components/page_title/PageTitle";
import { Alert } from "@/components/ui/Alert/Alert";
import { Button } from "@/components/ui/Button/Button";
import { Table } from "@/components/ui/Table/Table";
import { useElection } from "@/hooks/election/useElection";
import { t, tx } from "@/i18n/translate";

export function AddInvestigationPage() {
  const { pollingStations, investigations } = useElection();

  const availablePollingStations = pollingStations.filter(
    (station) => !investigations.some((investigation) => investigation.polling_station_id === station.id),
  );

  return (
    <>
      <PageTitle title={`${t("investigations.title")} - Abacus`} />
      <header>
        <section>
          <h1>{t("investigations.add_investigation")}</h1>
        </section>
      </header>
      {!availablePollingStations.length && (
        <Alert type="error">
          <strong className="heading-md">{t("investigations.no_polling_stations_to_choose")}</strong>
          <p>{tx("investigations.you_cannot_add_another_investigation")}</p>
          <Button.Link to="..">{t("back_to_overview")}</Button.Link>
        </Alert>
      )}
      <main>
        <section className="sm">
          <h2>{t("investigations.investigate_which_polling_station")}</h2>
          <p className="mb-md-lg">{t("investigations.multiple_polling_stations")}</p>
          <Table id="polling_stations">
            <Table.Header>
              <Table.HeaderCell numberWidth className="text-align-r">
                {t("number")}
              </Table.HeaderCell>
              <Table.HeaderCell>{t("polling_station.title.singular")}</Table.HeaderCell>
            </Table.Header>
            <Table.Body className="fs-md">
              {!availablePollingStations.length ? (
                <Table.Row>
                  <Table.Cell colSpan={2} className="fs-md">
                    {t("no_polling_stations_found")}
                  </Table.Cell>
                </Table.Row>
              ) : (
                availablePollingStations.map((station) => (
                  <Table.LinkRow key={station.id} to={`../${station.id}/reason`}>
                    <Table.NumberCell>{station.number}</Table.NumberCell>
                    <Table.Cell className="break-word">{station.name}</Table.Cell>
                  </Table.LinkRow>
                ))
              )}
            </Table.Body>
          </Table>
        </section>
      </main>
    </>
  );
}
