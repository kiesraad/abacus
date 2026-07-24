import { type NavigateFunction, useNavigate } from "react-router";

import { PageTitle } from "@/components/page_title/PageTitle";
import { DataEntrySourceNumber } from "@/components/ui/Badge/DataEntrySourceNumber";
import { Loader } from "@/components/ui/Loader/Loader";
import { useMessages } from "@/hooks/messages/useMessages";
import { useNumericParam } from "@/hooks/useNumericParam";
import { useUsers } from "@/hooks/user/useUsers";
import { t } from "@/i18n/translate";
import type { DataEntryGetDifferencesResponse, DataEntryStatusName } from "@/types/generated/openapi";

import { type ResolveOutcome, useDataEntryDifferences } from "../hooks/useDataEntryDifferences";
import cls from "./ResolveDifferences.module.css";
import { ResolveDifferencesForm } from "./ResolveDifferencesForm";
import { ResolveDifferencesOverview } from "./ResolveDifferencesOverview";
import { ResolveDifferencesTables } from "./ResolveDifferencesTables";

interface ResolveDifferencesNavigation {
  differences: DataEntryGetDifferencesResponse;
  electionId: number;
  dataEntryId: number;
  pushMessage: ReturnType<typeof useMessages>["pushMessage"];
  navigate: NavigateFunction;
  getName: ReturnType<typeof useUsers>["getName"];
}

// Push the result message and navigate away after resolving differences
function navigateAfterResolve(
  { differences, electionId, dataEntryId, pushMessage, navigate, getName }: ResolveDifferencesNavigation,
  status: DataEntryStatusName,
  outcome: ResolveOutcome,
) {
  const number = differences.source.number;

  switch (status) {
    case "first_entry_has_errors":
      pushMessage({
        title: t("data_entry_detail.resolve_errors.differences_resolved", { number }),
        text: t("data_entry_detail.resolve_errors.alert_contains_errors"),
      });
      void navigate(`/elections/${electionId}/status/${dataEntryId}/detail`);
      break;
    case "first_entry_finalised":
      pushMessage({
        title: t("election_status.success.differences_resolved", { number }),
        text:
          outcome.wrongEntryAction === "correct"
            ? t("election_status.success.data_entry_corrected", { typist: getName(outcome.wrongUserId) })
            : t("election_status.success.data_entry_kept", { typist: getName(outcome.keptUserId) }),
      });
      void navigate(`/elections/${electionId}/status`);
      break;
    case "empty":
      pushMessage({
        title: t("election_status.success.differences_resolved", { number }),
        text: t("election_status.success.data_entries_discarded", { number }),
      });
      void navigate(`/elections/${electionId}/status`);
      break;
  }
}

export function ResolveDifferencesPage() {
  const { pushMessage } = useMessages();
  const navigate = useNavigate();
  const { getName } = useUsers();
  const dataEntryId = useNumericParam("dataEntryId");
  const {
    election,
    loading,
    differences,
    dataEntryStructure,
    correctEntry,
    setCorrectEntry,
    wrongEntryAction,
    setWrongEntryAction,
    correctEntryError,
    wrongEntryError,
    onSubmit,
  } = useDataEntryDifferences(dataEntryId, afterSave);

  function afterSave(status: DataEntryStatusName, outcome: ResolveOutcome) {
    if (differences) {
      const context = { differences, electionId: election.id, dataEntryId, pushMessage, navigate, getName };
      navigateAfterResolve(context, status, outcome);
    }
  }

  if (loading || differences === null || dataEntryStructure === null) {
    return <Loader />;
  }

  const { first_entry, first_entry_user_id, second_entry, second_entry_user_id, source } = differences;

  return (
    <>
      <PageTitle title={`${t("resolve_differences.page_title")} - Abacus`} />
      <header>
        <section className="smaller-gap">
          <DataEntrySourceNumber>{source.number}</DataEntrySourceNumber>
          <h1>{source.name}</h1>
        </section>
      </header>
      <main className={cls.resolveDifferences}>
        <aside>
          <ResolveDifferencesOverview first={first_entry} second={second_entry} structure={dataEntryStructure} />
        </aside>
        <article>
          <h2>{t("resolve_differences.title")}</h2>
          <p className="md">{t("resolve_differences.page_content")}</p>
          <ResolveDifferencesTables
            first={first_entry}
            second={second_entry}
            structure={dataEntryStructure}
            correctEntry={correctEntry}
          />
          <ResolveDifferencesForm
            firstEntryName={getName(first_entry_user_id)}
            secondEntryName={getName(second_entry_user_id)}
            correctEntry={correctEntry}
            setCorrectEntry={setCorrectEntry}
            wrongEntryAction={wrongEntryAction}
            setWrongEntryAction={setWrongEntryAction}
            correctEntryError={correctEntryError}
            wrongEntryError={wrongEntryError}
            onSubmit={onSubmit}
          />
        </article>
      </main>
    </>
  );
}
