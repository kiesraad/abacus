import { PollingStationType, usePollingStationListRequest } from "@kiesraad/api";
import { IconChevronRight } from "@kiesraad/icon";
import { PageTitle } from "@kiesraad/ui";
import { useNumericParam } from "@kiesraad/util";

const labelForPollingStationType: { [K in PollingStationType]: string } = {
  FixedLocation: "Vaste locatie",
  Special: "Bijzonder",
  Mobile: "Mobiel",
};

export function PollingStationListPage() {
  const electionId = useNumericParam("electionId");
  const { state } = usePollingStationListRequest(electionId);

  if (state.status === "loading") {
    return null;
  }

  if (state.status === "api-error" || state.status === "network-error") {
    throw state.error;
  }

  const data = state.data;

  return (
    <>
      <PageTitle title="Stembureaus - Abacus" />
      <header>
        <section>
          <h1>Stembureaus</h1>
        </section>
      </header>
      <main>
        {!data.polling_stations.length ? (
          <article>
            <h2>Hoe wil je stembureaus toevoegen?</h2>
            Er zijn nog geen stembureaus ingevoerd voor deze verkiezing. Kies hoe je stembureaus gaat toevoegen.
            {/* TODO Create polling station: issue #431 */}
          </article>
        ) : (
          <article>
            <table id="polling_stations" className="polling_stations_table">
              <thead>
                <tr>
                  <th className="number">Nummer</th>
                  <th>Naam</th>
                  <th>Soort</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {data.polling_stations.map((station) => (
                  <tr key={station.id}>
                    <td className="number">{station.number}</td>
                    <td>{station.name}</td>
                    <td>{labelForPollingStationType[station.polling_station_type]}</td>
                    <td className="link">
                      <div className="link">
                        <IconChevronRight />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </article>
        )}
      </main>
    </>
  );
}
