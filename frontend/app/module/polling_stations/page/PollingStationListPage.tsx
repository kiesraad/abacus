import { Link } from "react-router-dom";

import { PollingStationType, usePollingStationListRequest } from "@kiesraad/api";
import { Loader, PageTitle, Table } from "@kiesraad/ui";
import { useNumericParam } from "@kiesraad/util";

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

  if (requestState.status === "api-error" || requestState.status === "network-error") {
    throw requestState.error;
  }

  const data = requestState.data;

  return (
    <>
      <PageTitle title="Stembureaus - Abacus" />
      <header>
        <section>
          <h1>Stembureaus</h1>
        </section>
      </header>
      <main>
        <Link to="create">Voeg toe</Link>
        {!data.polling_stations.length ? (
          <article>
            <h2>Hoe wil je stembureaus toevoegen?</h2>
            Er zijn nog geen stembureaus ingevoerd voor deze verkiezing. Kies hoe je stembureaus gaat toevoegen.
            {/* TODO Create polling station: issue #431 */}
          </article>
        ) : (
          <article>
            <Table id="polling_stations">
              <Table.Header>
                <Table.Column number>Nummer</Table.Column>
                <Table.Column>Naam</Table.Column>
                <Table.Column>Soort</Table.Column>
              </Table.Header>
              <Table.Body>
                {data.polling_stations.map((station) => (
                  <Table.LinkRow key={station.id} to={`#todo-${station.id}`}>
                    <Table.Cell number>{station.number}</Table.Cell>
                    <Table.Cell>{station.name}</Table.Cell>
                    <Table.Cell>{labelForPollingStationType[station.polling_station_type]}</Table.Cell>
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
