import { useNavigate } from "react-router";

import { PageTitle } from "@/components/page_title/PageTitle";
import { Badge } from "@/components/ui/Badge/Badge";
import { PollingStationNumber } from "@/components/ui/Badge/PollingStationNumber";
import { BottomBar } from "@/components/ui/BottomBar/BottomBar";
import { Button } from "@/components/ui/Button/Button";
import { ChoiceList } from "@/components/ui/CheckboxAndRadio/ChoiceList";
import { Loader } from "@/components/ui/Loader/Loader";
import { useNumericParam } from "@/hooks/useNumericParam";
import { t } from "@/lib/i18n";

import { usePollingStationDataEntryDifferences } from "../hooks/usePollingStationDataEntryDifferences";
import cls from "./ResolveDifferences.module.css";
import { ResolveDifferencesOverview } from "./ResolveDifferencesOverview";
import { ResolveDifferencesTables } from "./ResolveDifferencesTables";

export function ResolveDifferencesPage() {
  const navigate = useNavigate();
  const afterSave = () => {
    void navigate(`/elections/${election.id}/status`);
  };
  const pollingStationId = useNumericParam("pollingStationId");
  const { pollingStation, election, loading, status, action, setAction, onSubmit } =
    usePollingStationDataEntryDifferences(pollingStationId, afterSave);

  if (loading || status === null) {
    return <Loader />;
  }

  return (
    <>
      <PageTitle title={`${t("data_entry.entries_different")} - Abacus`} />
      <header>
        <section className="smaller-gap">
          <PollingStationNumber>{pollingStation.number}</PollingStationNumber>
          <h1>{pollingStation.name}</h1>
          <Badge type="entries_different" />
        </section>
      </header>
      <main className={cls.resolveDifferences}>
        <aside>
          <ResolveDifferencesOverview
            first={status.state.first_entry}
            second={status.state.second_entry}
            politicalGroups={election.political_groups}
          />
        </aside>
        <article>
          <h2>{t("resolve_differences.page_title")}</h2>
          <p>{t("resolve_differences.page_content")}</p>
          <ResolveDifferencesTables
            first={status.state.first_entry}
            second={status.state.second_entry}
            politicalGroups={election.political_groups}
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
              <ChoiceList.Radio
                id="keep_first_entry"
                label={t("resolve_differences.options.keep_first_entry", { name: status.first_user })}
                checked={action === "keep_first_entry"}
                onChange={() => {
                  setAction("keep_first_entry");
                }}
              />
              <ChoiceList.Radio
                id="keep_second_entry"
                label={t("resolve_differences.options.keep_second_entry", { name: status.second_user })}
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
