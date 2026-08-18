import type { ReactNode } from "react";
import { useLocation, useNavigate } from "react-router";

import { useInitialApiGet } from "@/api/useInitialApiGet";
import { CommitteeSessionStatusWithIcon } from "@/components/committee_session/CommitteeSessionStatus";
import { Footer } from "@/components/footer/Footer";
import { IconPlus } from "@/components/generated/icons";
import { Messages } from "@/components/messages/Messages";
import { NavBar } from "@/components/navbar/NavBar";
import { PageTitle } from "@/components/page_title/PageTitle";
import { Alert } from "@/components/ui/Alert/Alert";
import { Button } from "@/components/ui/Button/Button";
import { Loader } from "@/components/ui/Loader/Loader";
import { Table } from "@/components/ui/Table/Table";
import { Toolbar } from "@/components/ui/Toolbar/Toolbar";
import { useLiveData } from "@/hooks/useLiveData";
import { useUserRole } from "@/hooks/user/useUserRole";
import { t } from "@/i18n/translate";
import type { ELECTION_LIST_REQUEST_PATH, Election, ElectionListResponse } from "@/types/generated/openapi";
import { committeeSessionLabel } from "@/utils/committeeSession";
import { AddFirstElection } from "./AddFirstElection";
import cls from "./OverviewPage.module.css";

// biome-ignore lint/complexity/noExcessiveLinesPerFunction: TODO function should be refactored
export function OverviewPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { requestState: getElections, refetch: refetchElections } = useInitialApiGet<ElectionListResponse>(
    `/api/elections` satisfies ELECTION_LIST_REQUEST_PATH,
  );
  const { isTypist, isAdministrator, isCoordinator } = useUserRole();

  const isNewAccount = location.hash === "#new-account";
  const isAdminOrCoordinator = isAdministrator || isCoordinator;

  useLiveData(refetchElections);

  if (getElections.status === "loading") {
    return <Loader />;
  }

  if (getElections.status !== "success") {
    throw getElections.error;
  }

  const committeeSessionList = getElections.data.committee_sessions;
  const electionList = getElections.data.elections;

  interface ElectionRowProps {
    election: Election;
  }

  function ElectionRow({ election }: ElectionRowProps): ReactNode {
    function ElectionRowContent() {
      return (
        <>
          <Table.Cell>{election.name}</Table.Cell>
          <Table.Cell>
            {isTypist
              ? election.authority_region
              : `${t(`committee_category.${election.committee_category}.abbreviation`)} - ${election.authority_region}${election.domain?.id ? ` (${election.domain.id})` : ""}`}
          </Table.Cell>
          <Table.Cell>
            {isTypist ? (
              committeeSessionStatus
            ) : (
              <div className={cls.status}>
                {committeeSessionStatus}
                {committeeSessionString && `— ${committeeSessionString}`}
              </div>
            )}
          </Table.Cell>
        </>
      );
    }
    const committeeSession = committeeSessionList.find(
      (committeeSession) => committeeSession.election_id === election.id,
    );
    let electionLink: string | undefined;
    let committeeSessionStatus = <></>;
    let committeeSessionString = "";
    if (isAdminOrCoordinator) {
      electionLink = `/elections/${election.id}`;
    } else if (committeeSession && committeeSession.status === "data_entry") {
      electionLink = `/elections/${election.id}/data-entry`;
    }
    if (committeeSession) {
      committeeSessionStatus = (
        <CommitteeSessionStatusWithIcon
          status={committeeSession.status}
          committeeCategory={election.committee_category}
          userRole={isAdminOrCoordinator ? "coordinator" : "typist"}
        />
      );
      committeeSessionString = committeeSessionLabel(election.committee_category, committeeSession.number);
    }
    return (
      <Table.Row id={`election-row-${election.id}`} key={election.id} to={electionLink}>
        <ElectionRowContent />
      </Table.Row>
    );
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
          <h1>{isAdministrator ? t("election.manage") : t("election.title.plural")}</h1>
        </section>
      </header>

      <Messages />

      {isNewAccount && (
        <Alert type="success" onClose={closeNewAccountAlert}>
          <strong className="heading-md">{t("account_configured")}</strong>
          {isTypist && <p>{t("election.start_when_count_list_received")}</p>}
        </Alert>
      )}
      <main>
        <article>
          {!electionList.length ? (
            isAdministrator ? (
              <AddFirstElection />
            ) : (
              <>
                <h2>{t("election.not_ready_for_use")}</h2>
                <p>
                  {t("election.configuration_not_finished")} {isTypist && t("election.you_cannot_start_data_entry_yet")}
                </p>
              </>
            )
          ) : (
            <>
              {isAdministrator && (
                <Toolbar>
                  <Button.Link variant="secondary" size="sm" to={"./create"}>
                    <IconPlus /> {t("election.create")}
                  </Button.Link>
                </Toolbar>
              )}
              <Table id="overview">
                <Table.Header>
                  <Table.HeaderCell>{t("election.title.singular")}</Table.HeaderCell>
                  <Table.HeaderCell>
                    {isTypist ? t("election.location") : t("election.committee_category.title")}
                  </Table.HeaderCell>
                  <Table.HeaderCell>{t("election_status.label")}</Table.HeaderCell>
                </Table.Header>
                <Table.Body className="fs-md">
                  {electionList.map((election) => (
                    <ElectionRow key={election.id} election={election} />
                  ))}
                </Table.Body>
              </Table>
            </>
          )}
        </article>
      </main>
      <Footer />
    </>
  );
}
