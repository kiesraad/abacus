import * as React from "react";
import { ReactElement } from "react";
import { Link, useNavigate } from "react-router";

import { ErrorModal } from "app/component/error";

import { ApiError, useElection } from "@kiesraad/api";
import { t, tx } from "@kiesraad/i18n";
import {
  BottomBar,
  Button,
  Form,
  KeyboardKey,
  KeyboardKeys,
  MenuStatus,
  StatusList,
  useFormKeyboardNavigation,
} from "@kiesraad/ui";

import { DataEntryFormSectionStatus, getDataEntrySummary } from "../state/dataEntryUtils";
import { FormSectionId } from "../state/types";
import { useDataEntryContext } from "../state/useDataEntryContext";
import { getUrlForFormSectionID } from "../utils";

export function CheckAndSaveForm() {
  const formRef = React.useRef<HTMLFormElement>(null);
  useFormKeyboardNavigation(formRef);

  const navigate = useNavigate();
  const { election } = useElection();
  const { error, formState, status, onFinaliseDataEntry, pollingStationId, entryNumber } = useDataEntryContext({
    id: "save",
    type: "save",
  });

  const getUrlForFormSection = React.useCallback(
    (id: FormSectionId) => {
      return getUrlForFormSectionID(election.id, pollingStationId, entryNumber, id);
    },
    [election, pollingStationId, entryNumber],
  );

  const summary = React.useMemo(() => {
    return getDataEntrySummary(formState);
  }, [formState]);

  const finalisationAllowed = Object.values(formState.sections).every(
    (section) => section.errors.length === 0 && (section.warnings.length === 0 || section.acceptWarnings),
  );

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) =>
    void (async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (!finalisationAllowed) return;

      await onFinaliseDataEntry();
      await navigate(`/elections/${election.id}/data-entry#data-entry-saved-${entryNumber}`);
    })(event);

  return (
    <Form onSubmit={handleSubmit} id="check_save_form" title={t("check_and_save.title")} ref={formRef}>
      {error instanceof ApiError && <ErrorModal error={error} />}
      <section className="md" id="save-form-summary-text">
        {!summary.hasBlocks && summary.countsAddUp && (
          <p className="md">{t("check_and_save.counts_add_up.no_warnings")}</p>
        )}
        {summary.hasBlocks && summary.countsAddUp && (
          <>
            <p className="md">{t("check_and_save.counts_add_up.warnings")}</p>
            <p className="md">{t("check_and_save.check_warnings")}</p>
          </>
        )}
        {summary.hasBlocks && !summary.countsAddUp && (
          <>
            <p className="md">{t("check_and_save.counts_do_not_add_up")}</p>
            <p className="md">{t("check_and_save.fix_the_errors")}</p>
          </>
        )}
      </section>

      <StatusList id="save-form-summary-list">
        {summary.countsAddUp && (
          <StatusList.Item status="accept">{t("check_and_save.counts_add_up_title")}</StatusList.Item>
        )}

        {summary.notableFormSections.map((section) => {
          const link = (title: ReactElement) => <Link to={getUrlForFormSection(section.formSection.id)}>{title}</Link>;
          const content = tx(
            `check_and_save.notable_form_sections.${section.status}`,
            { link },
            { link_title: section.title || section.formSection.title || "" },
          );

          return (
            <StatusList.Item
              key={section.formSection.id}
              status={menuStatusForFormSectionStatus(section.status)}
              id={`section-status-${section.formSection.id}`}
            >
              {content}
            </StatusList.Item>
          );
        })}

        {!summary.hasBlocks && !summary.hasWarnings && (
          <StatusList.Item status="accept" id="no-blocking-errors-or-warnings">
            {t("check_and_save.no_warnings")}
          </StatusList.Item>
        )}
        {summary.hasBlocks ? (
          <StatusList.Item status={summary.hasErrors ? "error" : "warning"} id="form-cannot-be-saved" emphasis padding>
            {t("check_and_save.can_not_save")}
          </StatusList.Item>
        ) : (
          <StatusList.Item status="accept" id="form-can-be-saved" emphasis padding>
            {t("check_and_save.can_save")}
          </StatusList.Item>
        )}
      </StatusList>

      {finalisationAllowed && (
        <BottomBar type="form">
          <BottomBar.Row>
            <Button type="submit" size="lg" disabled={status === "finalising"}>
              {t("save")}
            </Button>
            <KeyboardKeys keys={[KeyboardKey.Shift, KeyboardKey.Enter]} />
          </BottomBar.Row>
        </BottomBar>
      )}
    </Form>
  );
}

function menuStatusForFormSectionStatus(status: DataEntryFormSectionStatus): MenuStatus {
  switch (status) {
    case "empty":
      return "empty";
    case "unaccepted-warnings":
      return "warning";
    case "accepted-warnings":
      return "accept";
    case "errors":
      return "error";
  }
}
