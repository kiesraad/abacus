import { PollingStationType, usePollingStationListRequest } from "@kiesraad/api";
import { t } from "@kiesraad/i18n";
import { Loader, PageTitle, Table } from "@kiesraad/ui";
import { useNumericParam } from "@kiesraad/util";

//TODO: Translated in Crud PR
const labelForPollingStationType: { [K in PollingStationType]: string } = {
  FixedLocation: "Vaste locatie",
  Special: "Bijzonder",
  Mobile: "Mobiel",
};

export function PollingStationListPage() {
  const electionId = useNumericParam("electionId");
  const { requestState } = usePollingStationListRequest(electionId);

  if (requestState.status === "loading") {
    return <Loader />;
  }

  if ("error" in requestState) {
    throw requestState.error;
  }

  const data = requestState.data;

  return (
    <>
      <PageTitle title={`${t("polling_stations")} - Abacus`} />
      <header>
        <section>
          <h1>{t("election.elections")}</h1>
        </section>
      </header>
      <main>
        {!data.polling_stations.length ? (
          <article>
            <h2>{t("polling_station.add_choice")}?</h2>
            {t("polling_station.empty")}
            {/* TODO Create polling station: issue #431 */}
          </article>
        ) : (
          <article>
            <Table id="polling_stations">
              <Table.Header>
                <Table.Column>{t("number")}</Table.Column>
                <Table.Column>{t("name")}</Table.Column>
                <Table.Column>{t("kind")}</Table.Column>
              </Table.Header>
              <Table.Body>
                {data.polling_stations.map((station) => (
                  <Table.LinkRow key={station.id} to={`#todo-${station.id}`}>
                    <Table.Cell number fontSizeClass="fs-body">
                      {station.number}
                    </Table.Cell>
                    <Table.Cell fontSizeClass="fs-md">{station.name}</Table.Cell>
                    <Table.Cell fontSizeClass="fs-md">
                      {labelForPollingStationType[station.polling_station_type]}
                    </Table.Cell>
                  </Table.LinkRow>
                ))}
              </Table.Body>
            </Table>
          </article>
        )}
      </main>
    </>
  );
}
