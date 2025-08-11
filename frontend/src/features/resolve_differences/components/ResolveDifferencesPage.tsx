import { useNavigate } from "react-router";

import { PageTitle } from "@/components/page_title/PageTitle";
import { PollingStationNumber } from "@/components/ui/Badge/PollingStationNumber";
import { Button } from "@/components/ui/Button/Button";
import { ChoiceList } from "@/components/ui/CheckboxAndRadio/ChoiceList";
import { Form } from "@/components/ui/Form/Form";
import { FormLayout } from "@/components/ui/Form/FormLayout";
import { Loader } from "@/components/ui/Loader/Loader";
import { useMessages } from "@/hooks/messages/useMessages";
import { useNumericParam } from "@/hooks/useNumericParam";
import { useUsers } from "@/hooks/user/useUsers";
import { t } from "@/i18n/translate";
import { DataEntryStatusName } from "@/types/generated/openapi";

import { usePollingStationDataEntryDifferences } from "../hooks/usePollingStationDataEntryDifferences";
import cls from "./ResolveDifferences.module.css";
import { ResolveDifferencesOverview } from "./ResolveDifferencesOverview";
import { ResolveDifferencesTables } from "./ResolveDifferencesTables";

export function ResolveDifferencesPage() {
  const { pushMessage } = useMessages();
  const navigate = useNavigate();
  const afterSave = (status: DataEntryStatusName, firstEntryUserId: number | undefined) => {
    switch (status) {
      case "first_entry_has_errors":
        pushMessage({
          title: t("resolve_errors.differences_resolved", { number: pollingStation.number }),
          text: t("resolve_errors.alert_contains_errors"),
        });
        void navigate(`/elections/${election.id}/status/${pollingStationId}/resolve-errors`);
        break;
      case "second_entry_not_started":
        pushMessage({
          title: t("election_status.success.differences_resolved", { nr: pollingStation.number }),
          text: t("election_status.success.data_entry_kept", { typist: getName(firstEntryUserId) }),
        });
        void navigate(`/elections/${election.id}/status`);
        break;
      case "first_entry_not_started":
        pushMessage({
          title: t("election_status.success.differences_resolved", { nr: pollingStation.number }),
          text: t("election_status.success.data_entries_discarded", { nr: pollingStation.number }),
        });
        void navigate(`/elections/${election.id}/status`);
        break;
    }
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
  const { getName } = useUsers();

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
          <p className="md">{t("resolve_differences.page_content")}</p>
          <ResolveDifferencesTables
            first={first_entry}
            second={second_entry}
            structure={dataEntryStructure}
            action={action}
          />
          <Form
            onSubmit={(e) => {
              e.preventDefault();
              void onSubmit();
            }}
          >
            <FormLayout>
              <FormLayout.Section title={t("resolve_differences.form_question")}>
                <p className="md">{t("resolve_differences.form_content")}</p>
                <ChoiceList>
                  {validationError && (
                    <ChoiceList.Error id="resolve-differences-error">{validationError}</ChoiceList.Error>
                  )}
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
              </FormLayout.Section>
              <FormLayout.Controls>
                <Button type="submit">{t("save")}</Button>
              </FormLayout.Controls>
            </FormLayout>
          </Form>
        </article>
      </main>
    </>
  );
}
