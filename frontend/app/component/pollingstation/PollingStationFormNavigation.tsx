import * as React from "react";
import { useBlocker, useNavigate } from "react-router";

import { ApiError, PollingStationResults } from "@kiesraad/api";
import { t, tx } from "@kiesraad/i18n";
import { Button, Modal } from "@kiesraad/ui";

import { ErrorModal } from "../error";
import { FormSectionId, SubmitCurrentFormOptions } from "../form/data_entry/state/types";
import { useDataEntryContext } from "../form/data_entry/state/useDataEntryContext";
import { getUrlForFormSectionID } from "./utils";

export interface PollingStationFormNavigationProps {
  onSubmit: (options?: SubmitCurrentFormOptions) => Promise<boolean>;
  currentValues: Partial<PollingStationResults>;
  hasChanges: boolean;
  acceptWarnings: boolean;
}

export function PollingStationFormNavigation({
  onSubmit,
  currentValues,
  acceptWarnings,
  hasChanges,
}: PollingStationFormNavigationProps) {
  const {
    status,
    election,
    pollingStationId,
    formState,
    error,
    currentForm,
    setCache,
    entryNumber,
    onDeleteDataEntry,
  } = useDataEntryContext();

  const navigate = useNavigate();

  const isPartOfDataEntryFlow = React.useCallback(
    (pathname: string) =>
      pathname.startsWith(`/elections/${election.id}/data-entry/${pollingStationId}/${entryNumber}`),
    [election, pollingStationId, entryNumber],
  );

  const getUrlForFormSection = (id: FormSectionId) =>
    getUrlForFormSectionID(election.id, pollingStationId, entryNumber, id);

  const blocker = useBlocker(({ currentLocation, nextLocation }) => {
    if (
      status === "deleted" ||
      status === "finalised" ||
      status === "aborted" ||
      currentLocation.pathname === nextLocation.pathname ||
      !currentForm
    ) {
      return false;
    }

    //check if nextLocation is outside the data entry flow
    if (!isPartOfDataEntryFlow(nextLocation.pathname)) {
      return true;
    }

    const reasons: BlockReason[] = [];
    const formSection = formState.sections[currentForm.id];
    if (formSection) {
      if (formSection.errors.length > 0) {
        reasons.push("errors");
      }

      if (formSection.warnings.length > 0 && !formSection.acceptWarnings) {
        reasons.push("warnings");
      }

      if (formSection.acceptWarnings !== acceptWarnings || hasChanges) {
        reasons.push("changes");
      }
    }

    //currently only block on changes
    if (reasons.includes("changes")) {
      if (formState.current === formState.furthest) {
        setCache({
          key: currentForm.id,
          data: currentValues,
        });

        return false;
      }

      return true;
    }

    return false;
  });

  //prevent navigating to sections that are not yet active
  React.useEffect(() => {
    const currentSection = formState.sections[formState.current];
    const furthestSection = formState.sections[formState.furthest];
    if (currentSection && furthestSection) {
      if (currentSection.index > furthestSection.index) {
        const url = getUrlForFormSection(furthestSection.id);
        void navigate(url);
      }
    }
  }, [formState, navigate, getUrlForFormSection]);

  // scroll up when an error occurs
  React.useEffect(() => {
    if (error) {
      window.scrollTo(0, 0);
    }
  }, [error]);

  async function onSave() {
    await onSubmit({ continueToNextSection: false });

    if (blocker.location) {
      void navigate(blocker.location.pathname);
    }

    if (blocker.reset) {
      blocker.reset();
    }
  }

  const onAbortModalSave = async () => {
    if (blocker.state === "blocked" && (await onSubmit({ continueToNextSection: false }))) {
      blocker.proceed();
    }
  };

  const onAbortModalDelete = async () => {
    if (blocker.state === "blocked" && (await onDeleteDataEntry())) {
      blocker.proceed();
    }
  };

  return (
    <>
      {blocker.state === "blocked" && (
        <>
          {!isPartOfDataEntryFlow(blocker.location.pathname) ? (
            <Modal title={t("data_entry.abort.title")} onClose={() => blocker.reset()}>
              {tx("data_entry.abort.description")}
              <nav>
                <Button size="lg" onClick={onAbortModalSave} disabled={status === "saving"}>
                  {t("data_entry.abort.save_input")}
                </Button>
                <Button size="lg" variant="secondary" onClick={onAbortModalDelete} disabled={status === "deleting"}>
                  {t("data_entry.abort.discard_input")}
                </Button>
              </nav>
            </Modal>
          ) : (
            <Modal
              title={t("polling_station.unsaved_changes_title")}
              onClose={() => {
                blocker.reset();
              }}
            >
              <p>
                {tx(
                  "polling_station.unsaved_changes_message",
                  {},
                  { name: formState.sections[formState.current]?.title || t("polling_station.current_form") },
                )}
              </p>
              <p>{t("polling_station.save_changes")}</p>
              <nav>
                <Button size="lg" onClick={onSave}>
                  {t("save_changes")}
                </Button>
                <Button
                  size="lg"
                  variant="secondary"
                  onClick={() => {
                    blocker.proceed();
                  }}
                >
                  {t("do_not_save")}
                </Button>
              </nav>
            </Modal>
          )}
        </>
      )}
      {error instanceof ApiError && <ErrorModal error={error} />}
    </>
  );
}

type BlockReason = "errors" | "warnings" | "changes";
