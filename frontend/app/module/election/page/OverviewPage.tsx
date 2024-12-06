import { Link, To, useLocation, useNavigate } from "react-router-dom";

import { ElectionStatusWithIcon } from "app/component/election/ElectionStatusWithIcon";
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
      <PageTitle title={`${t("overview")} - Abacus`} />
      <NavBar>
        <span className={isAdministrator ? "active" : ""}>
          {isAdministrator ? t("election.title.plural") : t("overview")}
        </span>
        {isAdministrator && (
          <>
            <Link to={"/users#administratorcoordinator"}>{t("users")}</Link>
            <Link to={"/workstations#administrator"}>{t("workstations.workstations")}</Link>
            <Link to={"/logs#administratorcoordinator"}>{t("logs")}</Link>
          </>
        )}
      </NavBar>
      <header>
        <section>
          <h1>{t(`election.${isAdministrator ? "manage" : "title.plural"}`)}</h1>
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
          <p>{t("election.start_when_count_list_received")}</p>
        </Alert>
      )}
      <main>
        <article>
          <Table id="overview">
            <Table.Header>
              <Table.Column>{t("election.title.singular")}</Table.Column>
              <Table.Column>{t(`election.polling_station.${isAdministrator ? "level" : "location"}`)}</Table.Column>
              <Table.Column>{t("election_status.label")}</Table.Column>
            </Table.Header>
            <Table.Body>
              {electionList.map((election) => (
                <Table.LinkRow key={election.id} to={electionLink(election)}>
                  <Table.Cell fontSizeClass="fs-body">{election.name}</Table.Cell>
                  <Table.Cell fontSizeClass="fs-md">{election.location}</Table.Cell>
                  <Table.Cell fontSizeClass="fs-md">
                    <ElectionStatusWithIcon
                      status={election.status}
                      userRole={isAdministrator ? "coordinator" : "typist"}
                    />
                  </Table.Cell>
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
