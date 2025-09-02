import { PageTitle } from "@/components/page_title/PageTitle";
import { Table } from "@/components/ui/Table/Table";
import { useElection } from "@/hooks/election/useElection";
import { t } from "@/i18n/translate";

export function AddInvestigationPage() {
  const { pollingStations } = useElection();

  // TODO fetch investigations for this election and filter pollingStations

  return (
    <>
      <PageTitle title={`${t("investigations.title")} - Abacus`} />
      <header>
        <section>
          <h1>{t("investigations.add_investigation")}</h1>
        </section>
      </header>
      <main>
        <section className="sm">
          <h2>{t("investigations.investigate_which_polling_station")}</h2>
          <p className="mb-md-lg">{t("investigations.multiple_polling_stations")}</p>
          <Table id="polling_stations">
            <Table.Header>
              <Table.HeaderCell className="text-align-r">{t("number")}</Table.HeaderCell>
              <Table.HeaderCell>{t("polling_station.title.singular")}</Table.HeaderCell>
            </Table.Header>
            <Table.Body className="fs-md">
              {pollingStations.map((station) => (
                <Table.LinkRow key={station.id} to={`./${station.id}/reason`}>
                  <Table.NumberCell>{station.number}</Table.NumberCell>
                  <Table.Cell className="break-word">{station.name}</Table.Cell>
                </Table.LinkRow>
              ))}
            </Table.Body>
          </Table>
        </section>
      </main>
    </>
  );
}
