import { To, useLocation, useNavigate } from "react-router";

import { Election } from "@/api/gen/openapi";
import { useUserRole } from "@/api/useUserRole";
import { ElectionStatusWithIcon } from "@/components/election_status_with_icon/ElectionStatusWithIcon";
import { Footer } from "@/components/footer/Footer";
import { NavBar } from "@/components/navbar/NavBar";
import { PageTitle } from "@/components/page_title/PageTitle";
import { Alert } from "@/components/ui/Alert/Alert";
import { Button } from "@/components/ui/Button/Button";
import { Table } from "@/components/ui/Table/Table";
import { Toolbar } from "@/components/ui/Toolbar/Toolbar";
import { t } from "@/lib/i18n";
import { IconPlus } from "@/lib/icon";

import { useElectionList } from "../hooks/useElectionList";

export function OverviewPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { electionList } = useElectionList();
  const { isAdministrator, isCoordinator } = useUserRole();

  const isNewAccount = location.hash === "#new-account";
  const isAdminOrCoordinator = isAdministrator || isCoordinator;

  function electionLink(election: Election): To {
    if (isAdminOrCoordinator) {
      return `/elections/${election.id}`;
    }

    return `/elections/${election.id}/data-entry`;
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
          <Toolbar>
            <Button.Link variant="secondary" size="sm" to={"./create"}>
              <IconPlus /> {t("election.create")}
            </Button.Link>
          </Toolbar>
          {!electionList.length ? (
            !isAdminOrCoordinator ? (
              <>
                <h2 className="mb-lg">{t("election.not_ready_for_use")}</h2>
                <p className="md form-paragraph">{t("election.please_wait_for_coordinator")}</p>
              </>
            ) : (
              <h2>{t("election.no_elections_added")}</h2>
              // TODO: To be expanded in issue #888
            )
          ) : (
            <Table id="overview">
              <Table.Header>
                <Table.HeaderCell>{t("election.title.singular")}</Table.HeaderCell>
                <Table.HeaderCell>
                  {!isAdminOrCoordinator ? t("election.location") : t("election.level_polling_station")}
                </Table.HeaderCell>
                <Table.HeaderCell>{t("election_status.label")}</Table.HeaderCell>
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
          )}
        </article>
      </main>
      <Footer />
    </>
  );
}
