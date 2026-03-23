import { useState } from "react";
import { Link } from "react-router";

import { type ApiResult, isError } from "@/api/ApiResult";
import { useApiState } from "@/api/useApiState";
import { useInitialApiGet } from "@/api/useInitialApiGet";
import { PageTitle } from "@/components/page_title/PageTitle";
import { AppLayout } from "@/components/ui/AppLayout/AppLayout";
import { Button } from "@/components/ui/Button/Button";
import { Loader } from "@/components/ui/Loader/Loader";
import { Modal } from "@/components/ui/Modal/Modal";
import { useUserRole } from "@/hooks/user/useUserRole";
import { t } from "@/i18n/translate";
import type {
  CommitteeSession,
  ELECTION_LIST_REQUEST_PATH,
  Election,
  ElectionListResponse,
  LoginResponse,
} from "@/types/generated/openapi";

import { GenerateTestElectionForm } from "./GenerateTestElectionForm";
import { MockTest } from "./MockTest";

function Links() {
  const { isTypist, isAdministrator, isCoordinator } = useUserRole();
  const { requestState: getElections } = useInitialApiGet<ElectionListResponse>(
    `/api/elections` satisfies ELECTION_LIST_REQUEST_PATH,
  );

  if (getElections.status === "loading") {
    return <Loader />;
  }

  if (getElections.status !== "success") {
    throw getElections.error;
  }

  const electionList = getElections.data.elections;
  const committeeSessions = getElections.data.committee_sessions;

  return (
    <>
      {(__API_MSW__ || isAdministrator || isCoordinator) && (
        <AdministratorCoordinatorLinks electionList={electionList} committeeSessions={committeeSessions} />
      )}
      {(__API_MSW__ || isTypist) && <TypistLinks electionList={electionList} committeeSessions={committeeSessions} />}
    </>
  );
}

interface LinksProps {
  electionList: Election[];
  committeeSessions: CommitteeSession[];
}

function TypistLinks({ electionList }: LinksProps) {
  const { role } = useUserRole();
  if (!role) return null;

  return (
    <>
      <strong>{t(role)}</strong>
      <ul>
        <li>
          <Link to={"/elections"}>{t("election.title.plural")}</Link>
        </li>
        <ul>
          {electionList.map((election) => (
            <li key={election.id}>
              <Link to={`/elections/${election.id}/data-entry`}>
                {election.name} ({election.committee_category})
              </Link>
            </li>
          ))}
        </ul>
      </ul>
    </>
  );
}

function AdministratorCoordinatorLinks({ electionList, committeeSessions }: LinksProps) {
  const { role, isAdministrator } = useUserRole();
  if (!role) return null;

  return (
    <>
      <strong>{t(role)}</strong>
      <ul>
        <li>
          <Link to={"/elections"}>{isAdministrator ? t("election.manage") : t("election.title.plural")}</Link>
        </li>
        <ul>
          {electionList.map((election) => {
            const committeeSession = committeeSessions.find((cs) => cs.election_id === election.id);

            return (
              <li key={election.id}>
                <Link to={`/elections/${election.id}`}>
                  {election.name} ({election.committee_category})
                </Link>
                <ul>
                  <li>
                    <Link to={`/elections/${election.id}/status`}>{t("election_status.main_title")}</Link>
                  </li>
                  {election.committee_category === "GSB" && (
                    <>
                      <li>
                        <Link to={`/elections/${election.id}/polling-stations`}>
                          {t("polling_station.title.plural")}
                        </Link>
                      </li>
                      {committeeSession && committeeSession.number > 1 && (
                        <li>
                          <Link to={`/elections/${election.id}/investigations`}>{t("investigations.title")}</Link>
                        </li>
                      )}
                    </>
                  )}
                </ul>
              </li>
            );
          })}
        </ul>
        <li>
          <Link to={`/users`}>{t("users.manage")}</Link>
        </li>
        <li>
          <Link to={`/logs`}>{t("activity_log")}</Link>
        </li>
      </ul>
    </>
  );
}

const users: Record<string, [string, string, string][]> = {
  Admin: [
    ["admin1", "Admin1Password01", `${t("administrator")} 1`],
    ["admin2", "Admin2Password01", `${t("administrator")} 2`],
  ],
  GSB: [
    ["coordinator1", "Coordinator1Password01", `${t("coordinator_gsb")} 1`],
    ["coordinator2", "Coordinator2Password01", `${t("coordinator_gsb")} 2`],
    ["typist1", "Typist1Password01", `${t("typist_gsb")} 1`],
    ["typist2", "Typist2Password01", `${t("typist_gsb")} 2`],
  ],
  CSB: [
    ["coordinator3", "Coordinator3Password03", `${t("coordinator_csb")} 3`],
    ["coordinator4", "Coordinator4Password04", `${t("coordinator_csb")} 4`],
    ["typist3", "Typist3Password03", `${t("typist_csb")} 3`],
    ["typist4", "Typist4Password04", `${t("typist_csb")} 4`],
  ],
};

function DevLinks() {
  const { user, login, logout } = useApiState();
  const [response, setResponse] = useState<ApiResult<LoginResponse> | null>(null);
  const [showGenerateElectionModal, setShowGenerateElectionModal] = useState(false);

  if (response !== null && isError(response)) {
    throw response;
  }

  return (
    <>
      <p>Dit is een ontwikkelversie van Abacus. Kies hieronder welk deel van de applicatie je wilt gebruiken.</p>
      <strong>{t("general")}</strong>
      <ul>
        <li>
          <Link to={`/account`}>{t("account.account")}</Link>
          <ul>
            <li>
              <Link to={`/account/login`}>{t("account.login")}</Link>
            </li>
            <li>
              <Link to={`/account/setup`}>{t("account.account_setup")}</Link>
            </li>
          </ul>
        </li>
        {__INCLUDE_STORYBOOK_LINK__ && (
          <li>
            <a href="/storybook/" target="_blank" rel="noopener noreferrer">
              Storybook
            </a>
          </li>
        )}
        <li>
          <Button
            variant="underlined"
            size="md"
            onClick={() => {
              setShowGenerateElectionModal(true);
            }}
          >
            Genereer testverkiezing
          </Button>
        </li>
      </ul>
      {!__API_MSW__ && (
        <>
          <strong>Inloggen als</strong>
          <ul>
            {Object.entries(users).map(([group, entries]) => (
              <li key={group}>
                {group}
                <ul>
                  {entries.map(([username, password, label]) => (
                    <li key={username}>
                      <Link
                        to="/dev"
                        onClick={() => {
                          void login(username, password).then(setResponse);
                        }}
                      >
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
            {user && (
              <li>
                <Link
                  to="/dev"
                  onClick={() => {
                    void logout();
                  }}
                >
                  {t("account.logout")}: {user.fullname || user.username} ({user.role})
                </Link>
              </li>
            )}
          </ul>
        </>
      )}
      {(__API_MSW__ || user) && <Links key={user?.username} />}
      {!__API_MSW__ && showGenerateElectionModal && (
        <Modal
          title="Genereer testverkiezing"
          onClose={() => {
            setShowGenerateElectionModal(false);
          }}
          noFlex
          autoWidth
        >
          <GenerateTestElectionForm />
        </Modal>
      )}
    </>
  );
}

export function DevHomePage() {
  return (
    <AppLayout>
      <PageTitle title="Dev Homepage - Abacus" />
      <header>
        <section>
          <h1>Abacus 🧮</h1>
        </section>
      </header>
      <main>
        <article>
          <DevLinks />
          {__API_MSW__ && <MockTest />}
        </article>
      </main>
    </AppLayout>
  );
}
