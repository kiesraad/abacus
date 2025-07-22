import { useNavigate } from "react-router";

import { ApiResponseStatus, FatalApiError } from "@/api/ApiResult";
import { PageTitle } from "@/components/page_title/PageTitle";
import { PollingStationNumber } from "@/components/ui/Badge/PollingStationNumber";
import { BottomBar } from "@/components/ui/BottomBar/BottomBar";
import { Button } from "@/components/ui/Button/Button";
import { ChoiceList } from "@/components/ui/CheckboxAndRadio/ChoiceList";
import { Loader } from "@/components/ui/Loader/Loader";
import { useElection } from "@/hooks/election/useElection";
import { useNumericParam } from "@/hooks/useNumericParam";
import { useUsers } from "@/hooks/user/useUsers";
import { t } from "@/i18n/translate";
import { DataEntryStatusName } from "@/types/generated/openapi";

import { usePollingStationDataEntryDifferences } from "../hooks/usePollingStationDataEntryDifferences";
import cls from "./ResolveDifferences.module.css";
import { ResolveDifferencesOverview } from "./ResolveDifferencesOverview";
import { ResolveDifferencesTables } from "./ResolveDifferencesTables";

export function ResolveDifferencesPage() {
  const navigate = useNavigate();
  const afterSave = (status: DataEntryStatusName) => {
    let nextPage = `/elections/${election.id}/status`;
    let message = "";

    switch (status) {
      case "first_entry_has_errors":
        nextPage = `/elections/${election.id}/status/${pollingStationId}/resolve-errors`;
        break;
      case "second_entry_not_started":
        message = `#data-entry-kept-${pollingStation.id}`;
        break;
      case "first_entry_not_started":
        message = `#data-entries-discarded-${pollingStation.id}`;
        break;
      default:
        break;
    }

    void navigate(nextPage + message);
  };

  const pollingStationId = useNumericParam("pollingStationId");
  const {
    pollingStation,
    election,
    loading,
    differences,
    dataEntryStructure,
    action,
    setAction,
    onSubmit,
    validationError,
  } = usePollingStationDataEntryDifferences(pollingStationId, afterSave);
  const { committeeSession } = useElection();
  const { getName } = useUsers();

  // Safeguard so users cannot circumvent the check via the browser's address bar
  if (committeeSession.status !== "data_entry_in_progress" && committeeSession.status !== "data_entry_paused") {
    throw new FatalApiError(
      ApiResponseStatus.ClientError,
      403,
      "Committee session should have status DataEntryInProgress or DataEntryPaused",
      "Forbidden",
    );
  }

  if (loading || differences === null || dataEntryStructure === null) {
    return <Loader />;
  }

  const { first_entry, first_entry_user_id, second_entry, second_entry_user_id } = differences;

  return (
    <>
      <PageTitle title={`${t("resolve_differences.page_title")} - Abacus`} />
      <header>
        <section className="smaller-gap">
          <PollingStationNumber>{pollingStation.number}</PollingStationNumber>
          <h1>{pollingStation.name}</h1>
        </section>
      </header>
      <main className={cls.resolveDifferences}>
        <aside>
          <ResolveDifferencesOverview first={first_entry} second={second_entry} structure={dataEntryStructure} />
        </aside>
        <article>
          <h2>{t("resolve_differences.title")}</h2>
          <p>{t("resolve_differences.page_content")}</p>
          <ResolveDifferencesTables
            first={first_entry}
            second={second_entry}
            structure={dataEntryStructure}
            action={action}
          />
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void onSubmit();
            }}
          >
            <h3 className="heading-lg mb-md">{t("resolve_differences.form_question")}</h3>
            <p>{t("resolve_differences.form_content")}</p>
            <ChoiceList>
              {validationError && <ChoiceList.Error id="resolve-differences-error">{validationError}</ChoiceList.Error>}
              <ChoiceList.Radio
                id="keep_first_entry"
                label={t("resolve_differences.options.keep_first_entry", { name: getName(first_entry_user_id) })}
                checked={action === "keep_first_entry"}
                onChange={() => {
                  setAction("keep_first_entry");
                }}
              />
              <ChoiceList.Radio
                id="keep_second_entry"
                label={t("resolve_differences.options.keep_second_entry", { name: getName(second_entry_user_id) })}
                checked={action === "keep_second_entry"}
                onChange={() => {
                  setAction("keep_second_entry");
                }}
              />
              <ChoiceList.Radio
                id="discard_both_entries"
                label={t("resolve_differences.options.discard_both_entries")}
                checked={action === "discard_both_entries"}
                onChange={() => {
                  setAction("discard_both_entries");
                }}
              />
            </ChoiceList>
            <BottomBar type="form">
              <BottomBar.Row>
                <Button size="xl" type="submit">
                  {t("save")}
                </Button>
              </BottomBar.Row>
            </BottomBar>
          </form>
        </article>
      </main>
    </>
  );
}
