import * as React from "react";
import { Link, useNavigate } from "react-router";

import { ApiError, useElection } from "@/api";
import { ErrorModal } from "@/components/error";
import {
  BottomBar,
  Button,
  Form,
  KeyboardKey,
  KeyboardKeys,
  MenuStatus,
  StatusList,
  useFormKeyboardNavigation,
} from "@/components/ui";
import { t, tx } from "@/lib/i18n";
import { FormSectionId } from "@/types/types";

import { useDataEntryContext } from "../../hooks/useDataEntryContext";
import { DataEntryFormSectionStatus, getDataEntrySummary } from "../../utils/dataEntryUtils";
import { getUrlForFormSectionID } from "../../utils/utils";
import { DataEntryNavigation } from "../DataEntryNavigation";

export function CheckAndSaveForm() {
  const formRef = React.useRef<HTMLFormElement>(null);
  useFormKeyboardNavigation(formRef);

  const navigate = useNavigate();
  const { election } = useElection();
  const { error, formState, status, onFinaliseDataEntry, pollingStationId, entryNumber } = useDataEntryContext("save");

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
    (section) => section.errors.isEmpty() && (section.warnings.isEmpty() || section.acceptWarnings),
  );

  const onFinalise = async () => {
    if (!finalisationAllowed) {
      return false;
    }

    await onFinaliseDataEntry();
    await navigate(`/elections/${election.id}/data-entry#data-entry-saved-${entryNumber}`);

    return true;
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void onFinalise();
  };

  return (
    <Form onSubmit={handleSubmit} id="check_save_form" title={t("check_and_save.title")} ref={formRef}>
      <DataEntryNavigation onSubmit={onFinalise} />
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
          const link = (title: React.ReactElement) => (
            <Link to={getUrlForFormSection(section.formSection.id)}>{title}</Link>
          );
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
