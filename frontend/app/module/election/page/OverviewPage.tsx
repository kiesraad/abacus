import { Link, To, useLocation, useNavigate } from "react-router-dom";

import { ElectionStatusWithIcon } from "app/component/election/ElectionStatusWithIcon.tsx";
import { Footer } from "app/component/footer/Footer";
import { NavBar } from "app/component/navbar/NavBar";

import { Election, useElectionList } from "@kiesraad/api";
import { t } from "@kiesraad/i18n";
import { Alert, PageTitle, Table, WorkStationNumber } from "@kiesraad/ui";

export function OverviewPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { electionList } = useElectionList();

  const isNewAccount = location.hash === "#new-account";
  const isAdministrator = location.hash.includes("administrator");

  function electionLink(election: Election): To {
    if (isAdministrator) {
      return `/elections/${election.id}#coordinator`;
    } else {
      return `/elections/${election.id}/data-entry`;
    }
  }

  function closeNewAccountAlert() {
    navigate(location.pathname);
  }

  return (
    <>
      <PageTitle title="Overzicht verkiezingen - Abacus" />
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
          <h1>{isAdministrator ? t("manage_elections") : t("elections")}</h1>
        </section>
        {!isAdministrator && (
          <section>
            <WorkStationNumber>16</WorkStationNumber>
          </section>
        )}
      </header>
      {isNewAccount && (
        <Alert type="success" onClose={closeNewAccountAlert}>
          <h2>{t("account_configured")}</h2>
          <p>Zodra je een tellijst van een stembureau hebt gekregen kan je beginnen met invoeren.</p>
        </Alert>
      )}
      <main>
        <article>
          <Table id="overview">
            <Table.Header>
              <Table.Column>{t("election")}</Table.Column>
              {isAdministrator && <Table.Column>{t("role")}</Table.Column>}
              <Table.Column>{t("election_status.label")}</Table.Column>
            </Table.Header>
            <Table.Body>
              {electionList.map((election) => (
                <Table.LinkRow key={election.id} to={electionLink(election)}>
                  <Table.Cell>{election.name}</Table.Cell>
                  {isAdministrator && <Table.Cell></Table.Cell>}
                  <Table.Cell>{ElectionStatusWithIcon(election.status, false, isAdministrator)}</Table.Cell>
                </Table.LinkRow>
              ))}
            </Table.Body>
          </Table>
        </article>
      </main>
      <Footer />
    </>
  );
}
