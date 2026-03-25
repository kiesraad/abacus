import { useNavigate } from "react-router";

import { PageTitle } from "@/components/page_title/PageTitle";
import { DataEntrySourceNumber } from "@/components/ui/Badge/DataEntrySourceNumber";
import { Button } from "@/components/ui/Button/Button";
import { ChoiceList } from "@/components/ui/CheckboxAndRadio/ChoiceList";
import { Form } from "@/components/ui/Form/Form";
import { FormLayout } from "@/components/ui/Form/FormLayout";
import { Loader } from "@/components/ui/Loader/Loader";
import { useMessages } from "@/hooks/messages/useMessages";
import { useNumericParam } from "@/hooks/useNumericParam";
import { useUsers } from "@/hooks/user/useUsers";
import { t } from "@/i18n/translate";
import type { DataEntryStatusName } from "@/types/generated/openapi";

import { useDataEntryDifferences } from "../hooks/useDataEntryDifferences";
import cls from "./ResolveDifferences.module.css";
import { ResolveDifferencesOverview } from "./ResolveDifferencesOverview";
import { ResolveDifferencesTables } from "./ResolveDifferencesTables";

// biome-ignore lint/complexity/noExcessiveLinesPerFunction: TODO function should be refactored
export function ResolveDifferencesPage() {
  const { pushMessage } = useMessages();
  const navigate = useNavigate();
  const dataEntryId = useNumericParam("dataEntryId");
  const { election, loading, differences, dataEntryStructure, action, setAction, onSubmit, validationError } =
    useDataEntryDifferences(dataEntryId, afterSave);
  const { getName } = useUsers();

  function afterSave(status: DataEntryStatusName, firstEntryUserId: number | undefined) {
    if (!differences) {
      return;
    }
    const number = differences.source.number;

    switch (status) {
      case "first_entry_has_errors":
        pushMessage({
          title: t("data_entry_detail.resolve_errors.differences_resolved", { number }),
          text: t("data_entry_detail.resolve_errors.alert_contains_errors"),
        });
        void navigate(`/elections/${election.id}/status/${dataEntryId}/detail`);
        break;
      case "first_entry_finalised":
        pushMessage({
          title: t("election_status.success.differences_resolved", { number }),
          text: t("election_status.success.data_entry_kept", { typist: getName(firstEntryUserId) }),
        });
        void navigate(`/elections/${election.id}/status`);
        break;
      case "empty":
        pushMessage({
          title: t("election_status.success.differences_resolved", { number }),
          text: t("election_status.success.data_entries_discarded", { number }),
        });
        void navigate(`/elections/${election.id}/status`);
        break;
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
