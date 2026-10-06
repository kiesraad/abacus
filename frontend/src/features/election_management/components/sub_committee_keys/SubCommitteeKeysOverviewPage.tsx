import { useState } from "react";

import { Footer } from "@/components/footer/Footer";
import { Messages } from "@/components/messages/Messages";
import { PageTitle } from "@/components/page_title/PageTitle";
import { Loader } from "@/components/ui/Loader/Loader";
import { useElection } from "@/hooks/election/useElection";
import { t } from "@/i18n/translate";

import { useSubCommitteeListRequest } from "../../hooks/useSubCommitteeListRequest";
import { SubCommitteeKeysOverview } from "./SubCommitteeKeysOverview";

export function SubCommitteeKeysOverviewPage() {
  const { election } = useElection();
  const { requestState, refetch } = useSubCommitteeListRequest(election.id);
  const [messagesVersion, setMessagesVersion] = useState(0);

  function onSuccess() {
    setMessagesVersion((version) => version + 1);
    void refetch();
  }

  if (requestState.status === "loading") {
    return <Loader />;
  }

  if ("error" in requestState) {
    throw requestState.error;
  }

  return (
    <>
      <PageTitle title={`${t("sub_committee_keys.title")} - Abacus`} />
      <header>
        <section>
          <h1>{t("sub_committee_keys.manage")}</h1>
        </section>
      </header>

      <Messages key={messagesVersion} />

      <main>
        <SubCommitteeKeysOverview subCommittees={requestState.data} electionId={election.id} onSuccess={onSuccess} />
      </main>
      <Footer />
    </>
  );
}
