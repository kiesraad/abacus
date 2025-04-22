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
import { ResolveDifferencesTables } from "./ResolveDifferencesTables";

export function ResolveDifferencesPage() {
  const pollingStationId = useNumericParam("pollingStationId");
  const { pollingStation, election, loading, status, choice, setChoice, onSubmit } =
    usePollingStationDataEntryDifferences(pollingStationId);

  if (loading || status === null) {
    return <Loader />;
  }

  return (
    <>
      <header>
        <section className="smaller-gap">
          <PollingStationNumber>{pollingStation.number}</PollingStationNumber>
          <h1>{pollingStation.name}</h1>
          <Badge type="entries_different" />
        </section>
      </header>
      <main className={cls.resolveDifferences}>
        <aside>{/* TODO: status overview */}</aside>
        <article>
          <h2 className="">{t("resolve_differences.page_title")}</h2>
          <p>{t("resolve_differences.page_content")}</p>
          <ResolveDifferencesTables
            first={status.state.first_entry}
            second={status.state.second_entry}
            politicalGroups={election.political_groups}
            previewChoice={choice}
          />
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void onSubmit();
            }}
          >
            <h2>{t("resolve_differences.form_question")}</h2>
            <p>{t("resolve_differences.form_content")}</p>
            <ChoiceList>
              <ChoiceList.Radio
                id="keep_first_entry"
                label={t("resolve_differences.options.keep_first_entry", { name: status.first_user })}
                checked={choice === "keep_first_entry"}
                onChange={() => {
                  setChoice("keep_first_entry");
                }}
              />
              <ChoiceList.Radio
                id="keep_second_entry"
                label={t("resolve_differences.options.keep_second_entry", { name: status.second_user })}
                checked={choice === "keep_second_entry"}
                onChange={() => {
                  setChoice("keep_second_entry");
                }}
              />
              <ChoiceList.Radio
                id="discard_both_entries"
                label={t("resolve_differences.options.discard_both_entries")}
                checked={choice === "discard_both_entries"}
                onChange={() => {
                  setChoice("discard_both_entries");
                }}
              />
            </ChoiceList>
            <BottomBar type="form">
              <BottomBar.Row>
                <Button size="lg" type="submit">
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
