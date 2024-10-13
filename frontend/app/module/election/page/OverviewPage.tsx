import { Link, useLocation, useNavigate } from "react-router-dom";

import { NavBar } from "app/component/navbar/NavBar";

import { Election, useElectionList } from "@kiesraad/api";
import { IconCheckHeart, IconChevronRight } from "@kiesraad/icon";
import { Alert, Icon, WorkStationNumber } from "@kiesraad/ui";

export function OverviewPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const handleRowClick = (election: Election) => {
    return () => {
      navigate(`/elections/${election.id}/data-entry`);
    };
  };
  const { electionList } = useElectionList();

  const isNewAccount = location.hash.includes("new-account");
  const isAdministrator = location.hash.includes("administrator");

  function closeNewAccountAlert() {
    navigate(location.pathname);
  }

  return (
    <div className="app-layout">
      <NavBar>
        <span className={isAdministrator ? "active" : ""}>{isAdministrator ? "Verkiezingen" : "Overzicht"}</span>
        {isAdministrator && (
          <>
            <Link to={"/users#administratorcoordinator"}>Gebruikers</Link>
            <Link to={"/workstations#administrator"}>Invoerstations</Link>
            <Link to={"/logs#administratorcoordinator"}>Logs</Link>
          </>
        )}
      </NavBar>
      <header>
        <section>
          <h1>{`Verkiezingen${isAdministrator ? " beheren" : ""}`}</h1>
        </section>
        {!isAdministrator && (
          <section>
            <WorkStationNumber>16</WorkStationNumber>
          </section>
        )}
      </header>
      {isNewAccount && (
        <Alert type="success" onClose={closeNewAccountAlert}>
          <h2>Je account is ingesteld</h2>
          <p>Zodra je een tellijst van een stembureau hebt gekregen kan je beginnen met invoeren.</p>
        </Alert>
      )}
      <main>
        <article>
          <table id="overview" className="overview_table">
            <thead>
              <tr>
                <th>Verkiezing</th>
                {isAdministrator && <th>Rol</th>}
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {electionList.map((election) => (
                <tr onClick={handleRowClick(election)} key={election.id}>
                  <td>{election.name}</td>
                  {isAdministrator && <td></td>}
                  <td>
                    <div className="flex_overview">
                      <Icon icon={<IconCheckHeart />} color="accept" />
                      <span>{isAdministrator ? "Invoerders bezig" : "Invoer gestart"}</span>
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
    </div>
  );
}
