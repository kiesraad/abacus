import { WorkStationNumber } from "@kiesraad/ui";
import {
  IconCheckheart,
  IconCheckverified,
  IconChevronright,
  IconClock,
  IconHourglass,
} from "@kiesraad/icon";

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
              <tr>
                <td>Referendum uitbreiding stadshart 2026</td>
                <td>GSB - Juinen (045)</td>
                <td>
                  <div className="flex">
                    <IconHourglass />
                    <span>Invoer opgeschort</span>
                  </div>
                </td>
                <td className="align-center narrow">
                  <a href="/input">
                    <IconChevronright />
                  </a>
                </td>
              </tr>
              <tr>
                <td>Wijkraad Grachtenkwartier 2026</td>
                <td>Lokale verkiezing</td>
                <td>
                  <div className="flex">
                    <IconClock />
                    <span>Wachten op coördinator</span>
                  </div>
                </td>
                <td className="align-center narrow">
                  <a href="/input">
                    <IconChevronright />
                  </a>
                </td>
              </tr>
              <tr>
                <td>Europees Parlementsverkiezing 2024</td>
                <td></td>
                <td>
                  <div className="flex">
                    <IconCheckheart />
                    <span>Invoerders bezig</span>
                  </div>
                </td>
                <td className="align-center narrow">
                  <a href="/input">
                    <IconChevronright />
                  </a>
                </td>
              </tr>
              <tr>
                <td>Tweede Kamerverkiezing 2023</td>
                <td></td>
                <td>
                  <div className="flex">
                    <IconCheckverified />
                    <span>Steminvoer voltooid</span>
                  </div>
                </td>
                <td className="align-center narrow">
                  <a href="/input">
                    <IconChevronright />
                  </a>
                </td>
              </tr>
            </tbody>
          </table>
        </article>
      </main>
    </>
  );
}
