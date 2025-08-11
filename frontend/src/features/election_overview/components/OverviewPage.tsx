import { ReactNode, useEffect } from "react";
import { useLocation, useNavigate } from "react-router";

import { DEFAULT_CANCEL_REASON } from "@/api/ApiClient";
import { CommitteeSessionStatusWithIcon } from "@/components/committee_session/CommitteeSessionStatus";
import { Footer } from "@/components/footer/Footer";
import { IconPlus } from "@/components/generated/icons";
import { NavBar } from "@/components/navbar/NavBar";
import { PageTitle } from "@/components/page_title/PageTitle";
import { Alert } from "@/components/ui/Alert/Alert";
import { Button } from "@/components/ui/Button/Button";
import { Table } from "@/components/ui/Table/Table";
import { Toolbar } from "@/components/ui/Toolbar/Toolbar";
import { useElectionList } from "@/hooks/election/useElectionList";
import { useUserRole } from "@/hooks/user/useUserRole";
import { t } from "@/i18n/translate";
import { Election } from "@/types/generated/openapi";

export function OverviewPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { committeeSessionList, electionList, refetch } = useElectionList();
  const { isAdministrator, isCoordinator } = useUserRole();

  const isNewAccount = location.hash === "#new-account";
  const isAdminOrCoordinator = isAdministrator || isCoordinator;

  // re-fetch statuses when component mounts
  useEffect(() => {
    const abortController = new AbortController();

    void refetch(abortController);

    return () => {
      abortController.abort(DEFAULT_CANCEL_REASON);
    };
  }, [refetch]);

  interface ElectionRowProps {
    election: Election;
  }

  function ElectionRow({ election }: ElectionRowProps): ReactNode {
    function ElectionRowContent() {
      return (
        <>
          <Table.Cell>{election.name}</Table.Cell>
          <Table.Cell>{!isAdminOrCoordinator ? election.location : ""}</Table.Cell>
          <Table.Cell>{committeeSessionStatus}</Table.Cell>
        </>
      );
    }
    const committeeSession = committeeSessionList.find(
      (committeeSession) => committeeSession.election_id === election.id,
    );
    let electionLink = null;
    let committeeSessionStatus = <></>;
    if (isAdminOrCoordinator) {
      electionLink = `/elections/${election.id}`;
    } else if (committeeSession && committeeSession.status === "data_entry_in_progress") {
      electionLink = `/elections/${election.id}/data-entry`;
    }
    if (committeeSession) {
      committeeSessionStatus = (
        <CommitteeSessionStatusWithIcon
          status={committeeSession.status}
          userRole={isAdminOrCoordinator ? "coordinator" : "typist"}
        />
      );
    }
    if (electionLink) {
      return (
        <Table.LinkRow id={`election-row-${election.id}`} key={election.id} to={electionLink}>
          <ElectionRowContent />
        </Table.LinkRow>
      );
    } else {
      return (
        <Table.Row id={`election-row-${election.id}`}>
          <ElectionRowContent />
        </Table.Row>
      );
    }
  }

  function closeNewAccountAlert() {
    void navigate(location.pathname);
  }

  return (
    <>
      <PageTitle title={`${t("election.title.overview")} - Abacus`} />
      <NavBar />
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
            {isAdministrator && (
              <Button.Link variant="secondary" size="sm" to={"./create"}>
                <IconPlus /> {t("election.create")}
              </Button.Link>
            )}
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
                  <ElectionRow key={election.id} election={election} />
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
