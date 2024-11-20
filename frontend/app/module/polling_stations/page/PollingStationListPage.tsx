import { Link, useSearchParams } from "react-router-dom";

import { labelForPollingStationType, usePollingStationListRequest } from "@kiesraad/api";
import { Alert, Loader, PageTitle, Table } from "@kiesraad/ui";
import { useNumericParam } from "@kiesraad/util";

export function PollingStationListPage() {
  const electionId = useNumericParam("electionId");
  const [searchParams, setSearchParams] = useSearchParams();

  const { requestState } = usePollingStationListRequest(electionId);

  if (requestState.status === "loading") {
    return <Loader />;
  }

  if ("error" in requestState) {
    throw requestState.error;
  }

  const data = requestState.data;

  const updatedId = searchParams.get("updated");
  const updatedPollingStation = updatedId ? data.polling_stations.find((ps) => ps.id === parseInt(updatedId)) : null;

  const createdId = searchParams.get("created");
  const createdPollingStation = createdId ? data.polling_stations.find((ps) => ps.id === parseInt(createdId)) : null;

  const closeAlert = () => {
    setSearchParams("");
  };

  //TODO: Table needs highlight option
  return (
    <>
      <PageTitle title="Stembureaus - Abacus" />
      <header>
        <section>
          <h1>Stembureaus</h1>
        </section>
      </header>
      {updatedPollingStation && (
        <Alert type="success" onClose={closeAlert}>
          <p>Wijzigingen {updatedPollingStation.name} opgeslagen.</p>
        </Alert>
      )}

      {createdPollingStation && (
        <Alert type="success" onClose={closeAlert}>
          <p>{createdPollingStation.name} toegevoegd.</p>
        </Alert>
      )}
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
                <Table.Column>Nummer</Table.Column>
                <Table.Column>Naam</Table.Column>
                <Table.Column>Soort</Table.Column>
              </Table.Header>
              <Table.Body>
                {data.polling_stations.map((station) => (
                  <Table.LinkRow key={station.id} to={`update/${station.id}`}>
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
