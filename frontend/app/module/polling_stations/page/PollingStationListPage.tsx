import { PollingStationType, usePollingStationList } from "@kiesraad/api";
import { IconChevronRight } from "@kiesraad/icon";

function pollingStationType(pollingStationType: PollingStationType): string {
  switch (pollingStationType) {
    case "Bijzonder":
      return "Bijzonder";
    case "Mobiel":
      return "Mobiel";
    case "VasteLocatie":
      return "Vaste locatie";
  }
}

export function PollingStationListPage() {
  const { pollingStations } = usePollingStationList();

  return (
    <>
      <header>
        <section>
          <h1>Stembureaus</h1>
        </section>
      </header>
      <main>
        <article>
          <table id="polling_stations" className="polling_stations_table">
            <thead>
              <tr>
                <th>Nummer</th>
                <th>Naam</th>
                <th>Soort</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {pollingStations.map((station) => (
                <tr key={station.id}>
                  <td className={"number"}>{station.number}</td>
                  <td>{station.name}</td>
                  <td>{pollingStationType(station.polling_station_type)}</td>
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
      </main>
    </>
  );
}
