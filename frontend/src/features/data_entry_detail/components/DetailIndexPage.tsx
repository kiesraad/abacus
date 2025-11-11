import { Navigate, useNavigate } from "react-router";

import { Button } from "@/components/ui/Button/Button";
import { ChoiceList } from "@/components/ui/CheckboxAndRadio/ChoiceList";
import { Form } from "@/components/ui/Form/Form";
import { FormLayout } from "@/components/ui/Form/FormLayout";
import { Loader } from "@/components/ui/Loader/Loader";
import { useMessages } from "@/hooks/messages/useMessages";
import { useNumericParam } from "@/hooks/useNumericParam";
import { useUsers } from "@/hooks/user/useUsers";
import { t, tx } from "@/i18n/translate";
import { ResolveErrorsAction } from "@/types/generated/openapi";
import { getDataEntryStructure } from "@/utils/dataEntryStructure";

import { usePollingStationDataEntryErrors } from "../hooks/usePollingStationDataEntryErrors";
import cls from "./detail.module.css";
import { ErrorsAndWarningsOverview } from "./ErrorsAndWarningsOverview";

export function DetailIndexPage() {
  const { pushMessage } = useMessages();
  const navigate = useNavigate();
  const pollingStationId = useNumericParam("pollingStationId");
  const { pollingStation, election, loading, dataEntry, action, setAction, onSubmit, validationError } =
    usePollingStationDataEntryErrors(pollingStationId);

  const afterSave = (action: ResolveErrorsAction) => {
    switch (action) {
      case "resume_first_entry":
        pushMessage({
          title: t("election_status.success.data_entry_resumed", {
            nr: pollingStation.number,
            typist: getName(dataEntry?.user_id),
          }),
          text: t("election_status.success.typist_can_continue_data_entry"),
        });
        break;
      case "discard_first_entry":
        pushMessage({
          title: t("election_status.success.data_entry_discarded", { nr: pollingStation.number }),
          text: t("election_status.success.polling_station_can_be_filled_again"),
        });
        break;
    }
    void navigate(`/elections/${election.id}/status`);
  };

  const { getName } = useUsers();

  if (loading || dataEntry === null) {
    return <Loader />;
  }

  const structure = getDataEntryStructure(dataEntry.data.model, election);

  if (dataEntry.status !== "first_entry_has_errors" && dataEntry.validation_results.warnings.length === 0) {
    // Redirect to first section because Coordinator is viewing the read-only version and there are no warnings.
    // Therefor no need to show the errors and warnings overview
    // There are separate sections for fixed and scrollable groups (copied from DetailNavigation).
    // We only need the first fixed section here.
    const firstFixedSection = structure.filter((section) => !section.id.startsWith("political_group_votes_"))[0];
    const basePath = `/elections/${election.id}/status/${pollingStationId}/detail`;
    return <Navigate to={firstFixedSection ? `${basePath}/${firstFixedSection.id}` : basePath} replace />;
  } else {
    // Coordinator needs to resolve the errors using the resolve errors form.
    const formId = "resolve_errors_form";
    return (
      <>
        <h2>
          {t(
            `data_entry_detail.${dataEntry.status === "first_entry_has_errors" ? "resolve_errors.title" : "read_only.title"}`,
          )}
        </h2>
        <p className="md">
          {t(
            `data_entry_detail.${dataEntry.status === "first_entry_has_errors" ? "resolve_errors.page_content" : "read_only.page_content"}`,
          )}
        </p>

        <ErrorsAndWarningsOverview structure={structure} results={dataEntry.validation_results} />

        {dataEntry.status === "first_entry_has_errors" && (
          <Form
            id={formId}
            className={cls.resolveErrorsForm}
            onSubmit={(e) => {
              e.preventDefault();
              void onSubmit(afterSave);
            }}
          >
            <FormLayout>
              <FormLayout.Section title={t("data_entry_detail.resolve_errors.form_question")}>
                <p>{t("data_entry_detail.resolve_errors.form_content")}</p>
                <ChoiceList>
                  {validationError && <ChoiceList.Error id="resolve-errors-error">{validationError}</ChoiceList.Error>}
                  <ChoiceList.Radio
                    id="keep_entry"
                    label={tx("data_entry_detail.resolve_errors.options.resume_first_entry", undefined, {
                      name: getName(dataEntry.user_id),
                    })}
                    checked={action === "resume_first_entry"}
                    onChange={() => {
                      setAction("resume_first_entry");
                    }}
                  >
                    {t("data_entry_detail.resolve_errors.options.resume_first_entry_description")}
                  </ChoiceList.Radio>
                  <ChoiceList.Radio
                    id="discard_entry"
                    label={tx("data_entry_detail.resolve_errors.options.discard_first_entry")}
                    checked={action === "discard_first_entry"}
                    onChange={() => {
                      setAction("discard_first_entry");
                    }}
                  >
                    {t("data_entry_detail.resolve_errors.options.discard_first_entry_description")}
                  </ChoiceList.Radio>
                </ChoiceList>
              </FormLayout.Section>
              <FormLayout.Controls>
                <Button type="submit">{t("save")}</Button>
              </FormLayout.Controls>
            </FormLayout>
          </Form>
        )}
      </>
    );
  }
}
