import { To, useLocation, useNavigate } from "react-router";

import { ElectionStatusWithIcon } from "app/component/election/ElectionStatusWithIcon";
import { Footer } from "app/component/footer/Footer";
import { NavBar } from "app/component/navbar/NavBar";

import { Election, useElectionList } from "@kiesraad/api";
import { t } from "@kiesraad/i18n";
import { Alert, PageTitle, Table } from "@kiesraad/ui";

export function OverviewPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { electionList } = useElectionList();

  const isNewAccount = location.hash === "#new-account";
  const isAdminOrCoordinator = location.hash.includes("administrator") || location.hash.includes("coordinator");

  function electionLink(election: Election): To {
    if (isAdminOrCoordinator) {
      return `/elections/${election.id}#administratorcoordinator`;
    } else {
      return `/elections/${election.id}/data-entry`;
    }
  }

  function closeNewAccountAlert() {
    void navigate(location.pathname);
  }

  return (
    <>
      <PageTitle title={`${t("election.title.overview")} - Abacus`} />
      <NavBar location={location} />
      <header>
        <section>
          <h1>{isAdminOrCoordinator ? t("election.manage") : t("election.title.plural")}</h1>
        </section>
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
              <Table.Column>
                {!isAdminOrCoordinator ? t("election.location") : t("election.level_polling_station")}
              </Table.Column>
              <Table.Column>{t("election_status.label")}</Table.Column>
            </Table.Header>
            <Table.Body className="fs-md">
              {electionList.map((election) => (
                <Table.LinkRow key={election.id} to={electionLink(election)}>
                  <Table.Cell className="fs-body">{election.name}</Table.Cell>
                  <Table.Cell>{!isAdminOrCoordinator ? election.location : ""}</Table.Cell>
                  <Table.Cell>
                    <ElectionStatusWithIcon
                      status={election.status}
                      userRole={isAdminOrCoordinator ? "coordinator" : "typist"}
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
