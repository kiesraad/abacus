import { WorkStationNumber } from "@kiesraad/ui";

export function OverviewPage() {
  return (
    <>
      <header>
        <section>
          <h1>Verkiezingen</h1>
        </section>
        <section>
          <WorkStationNumber>16</WorkStationNumber>
        </section>
      </header>
      <main>
        <article>
          <table id="overview" className="overview_table">
            <thead>
              <tr>
                <th>Verkiezing</th>
                <th>Rol</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {/* TODO: Add icons once Ellen has dev mode access to Figma again */}
              <tr>
                <td>Referendum uitbreiding stadshart 2026</td>
                <td>GSB - Juinen (045)</td>
                <td>Invoer opgeschort</td>
                <td className="align-center narrow">
                  <a href="/input">Link</a>
                </td>
              </tr>
              <tr>
                <td>Wijkraad Grachtenkwartier 2026</td>
                <td>Lokale verkiezing</td>
                <td>Wachten op coordinator</td>
                <td className="align-center narrow">
                  <a href="/input">Link</a>
                </td>
              </tr>
              <tr>
                <td>Europees Parlementsverkiezing 2024</td>
                <td></td>
                <td>Invoerders bezig</td>
                <td className="align-center narrow">
                  <a href="/input">Link</a>
                </td>
              </tr>
              <tr>
                <td>Tweede Kamerverkiezing 2023</td>
                <td></td>
                <td>Steminvoer voltooid</td>
                <td className="align-center narrow">
                  <a href="/input">Link</a>
                </td>
              </tr>
            </tbody>
          </table>
        </article>
      </main>
    </>
  );
}
