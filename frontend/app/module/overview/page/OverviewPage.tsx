import { useNavigate } from "react-router-dom";
import { WorkStationNumber } from "@kiesraad/ui";
import {
  IconCheckHeart,
  IconCheckVerified,
  IconChevronRight,
  IconClock,
  IconHourglass,
} from "@kiesraad/icon";

export function OverviewPage() {
  const navigate = useNavigate();
  const handleRowClick = () => {
    navigate(`/1/input`);
  };

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
              <tr onClick={handleRowClick}>
                <td>Referendum uitbreiding stadshart 2026</td>
                <td>GSB - Juinen (045)</td>
                <td>
                  <div className="flex_overview">
                    <IconHourglass />
                    <span>Invoer opgeschort</span>
                  </div>
                </td>
                <td className="link">
                  <div className="link">
                    <IconChevronRight />
                  </div>
                </td>
              </tr>
              <tr onClick={handleRowClick}>
                <td>Wijkraad Grachtenkwartier 2026</td>
                <td>Lokale verkiezing</td>
                <td>
                  <div className="flex_overview">
                    <IconClock />
                    <span>Wachten op coördinator</span>
                  </div>
                </td>
                <td className="link">
                  <div className="link">
                    <IconChevronRight />
                  </div>
                </td>
              </tr>
              <tr onClick={handleRowClick}>
                <td>Europees Parlementsverkiezing 2024</td>
                <td></td>
                <td>
                  <div className="flex_overview">
                    <IconCheckHeart />
                    <span>Invoerders bezig</span>
                  </div>
                </td>
                <td className="link">
                  <div className="link">
                    <IconChevronRight />
                  </div>
                </td>
              </tr>
              <tr onClick={handleRowClick}>
                <td>Tweede Kamerverkiezing 2023</td>
                <td></td>
                <td>
                  <div className="flex_overview">
                    <IconCheckVerified />
                    <span>Steminvoer voltooid</span>
                  </div>
                </td>
                <td className="link">
                  <div className="link">
                    <IconChevronRight />
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </article>
      </main>
    </>
  );
}
