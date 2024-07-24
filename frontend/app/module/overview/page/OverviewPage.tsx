import { useNavigate } from "react-router-dom";

import { Election, useElectionList } from "@kiesraad/api";
import { IconCheckHeart, IconChevronRight } from "@kiesraad/icon";
import { WorkStationNumber } from "@kiesraad/ui";

export function OverviewPage() {
  const navigate = useNavigate();
  const handleRowClick = (election: Election) => {
    return () => {
      navigate(`/${election.id}/input`);
    };
  };
  const { electionList } = useElectionList();

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
              {electionList.map((election) => (
                <tr onClick={handleRowClick(election)} key={election.id}>
                  <td>{election.name}</td>
                  <td></td>
                  <td>
                    <div className="flex_overview">
                      <IconCheckHeart />
                      <span>Invoerders bezig</span>
                      {/* TODO <IconHourglass />
                      <span>Invoer opgeschort</span>
                      <IconClock />
                      <span>Wachten op coördinator</span>
                      <IconCheckVerified />
                      <span>Steminvoer voltooid</span> */}
                    </div>
                  </td>
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
