import { useNavigate } from "react-router";

import { useInitialApiGet } from "@/api/useInitialApiGet";
import { HeaderElectionStatusWithIcon } from "@/components/election_status_with_icon/ElectionStatusWithIcon";
import { Footer } from "@/components/footer/Footer";
import { PageTitle } from "@/components/page_title/PageTitle";
import { Alert } from "@/components/ui/Alert/Alert";
import { Button } from "@/components/ui/Button/Button";
import { useElection } from "@/hooks/election/useElection";
import { useElectionStatus } from "@/hooks/election/useElectionStatus";
import { t } from "@/i18n/translate";
import { USER_LIST_REQUEST_PATH, UserListResponse } from "@/types/generated/openapi";

import { ElectionStatus } from "./ElectionStatus";

export function ElectionStatusPage() {
  const navigate = useNavigate();
  const { election, pollingStations } = useElection();
  const { statuses } = useElectionStatus();
  const { requestState } = useInitialApiGet<UserListResponse>("/api/user" satisfies USER_LIST_REQUEST_PATH);

  const users = requestState.status === "success" ? requestState.data.users : [];

  function finishInput() {
    void navigate("../report");
  }

  return (
    <>
      <PageTitle title={`${t("election_status.title")} - Abacus`} />
      <header>
        <section>
          <h1>{t("election_status.first_session")}</h1>
        </section>
        <section>
          <div className="election_status">
            <HeaderElectionStatusWithIcon status={election.status} userRole="coordinator" />
          </div>
        </section>
      </header>
      {election.status !== "DataEntryFinished" &&
        statuses.length > 0 &&
        statuses.every((s) => s.status === "definitive") && (
          <Alert type="success">
            <h2>{t("election_status.definitive.title")}</h2>
            <p>{t("election_status.definitive.message")}</p>
            <Button onClick={finishInput} size="md">
              {t("election_status.definitive.finish_button")}
            </Button>
          </Alert>
        )}
      <main>
        <ElectionStatus
          election={election}
          pollingStations={pollingStations}
          statuses={statuses}
          users={users}
          navigate={(path) => void navigate(path)}
        />
      </main>
      <Footer />
    </>
  );
}
