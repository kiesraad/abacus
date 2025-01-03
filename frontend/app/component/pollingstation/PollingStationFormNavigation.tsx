import * as React from "react";
import { BlockerFunction, useBlocker, useNavigate } from "react-router-dom";

import { AbortDataEntryModal } from "app/module/data_entry";

import { Election, PollingStationResults } from "@kiesraad/api";
import { t, tx } from "@kiesraad/i18n";
import { Button, Modal } from "@kiesraad/ui";

import { ErrorModal } from "../error";
import { AnyFormReference, FormSectionID, FormState } from "../form/data_entry/PollingStationFormController";
import { currentFormHasChanges } from "../form/data_entry/pollingStationUtils";
import { usePollingStationFormController } from "../form/data_entry/usePollingStationFormController";
import { getUrlForFormSectionID } from "./utils";

export interface PollingStationFormNavigationProps {
  pollingStationId: number;
  election: Required<Election>;
}

export function PollingStationFormNavigation({ pollingStationId, election }: PollingStationFormNavigationProps) {
  const { status, formState, apiError, currentForm, values, setTemporaryCache, submitCurrentForm, entryNumber } =
    usePollingStationFormController();

  const navigate = useNavigate();

  const isPartOfDataEntryFlow = React.useCallback(
    (pathname: string) =>
      pathname.startsWith(`/elections/${election.id}/data-entry/${pollingStationId}/${entryNumber}`),
    [election, pollingStationId, entryNumber],
  );

  const getUrlForFormSection = React.useCallback(
    (id: FormSectionID) => {
      return getUrlForFormSectionID(election.id, pollingStationId, entryNumber, id);
    },
    [election, pollingStationId, entryNumber],
  );

  const shouldBlock = React.useCallback<BlockerFunction>(
    ({ currentLocation, nextLocation }) => {
      if (
        status.current === "deleted" ||
        status.current === "finalised" ||
        status.current === "aborted" ||
        currentLocation.pathname === nextLocation.pathname ||
        !currentForm
      ) {
        return false;
      }

      //check if nextLocation is outside the data entry flow
      if (!isPartOfDataEntryFlow(nextLocation.pathname)) {
        return true;
      }

      const reasons = reasonsBlocked(formState, currentForm, values);

      //currently only block on changes
      if (reasons.includes("changes")) {
        if (formState.current === formState.furthest) {
          setTemporaryCache({
            key: currentForm.id,
            data: currentForm.getValues(),
          });
          return false;
        }
        return true;
      }

      return false;
    },
    [status, formState, currentForm, setTemporaryCache, values, isPartOfDataEntryFlow],
  );

  const blocker = useBlocker(shouldBlock);

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
    if (apiError) {
      window.scrollTo(0, 0);
    }
  }, [apiError]);

  const onSave = () =>
    void (async () => {
      await submitCurrentForm({ continueToNextSection: false });
      if (blocker.location) void navigate(blocker.location.pathname);
      if (blocker.reset) blocker.reset();
    })();

  return (
    <>
      {blocker.state === "blocked" && (
        <>
          {!isPartOfDataEntryFlow(blocker.location.pathname) ? (
            <AbortDataEntryModal
              onCancel={() => {
                blocker.reset();
              }}
              onSave={() => {
                blocker.proceed();
              }}
              onDelete={() => {
                blocker.proceed();
              }}
            />
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
                  {
                    name: formState.sections[formState.current]?.title || t("polling_station.current_form"),
                  },
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
      {apiError && <ErrorModal error={apiError} />}
    </>
  );
}

type BlockReason = "errors" | "warnings" | "changes";

function reasonsBlocked(
  formState: FormState,
  currentForm: AnyFormReference,
  values: PollingStationResults,
): BlockReason[] {
  const result: BlockReason[] = [];

  const formSection = formState.sections[currentForm.id];
  if (formSection) {
    if (formSection.errors.length > 0) {
      result.push("errors");
    }
    if (formSection.warnings.length > 0 && !formSection.acceptWarnings) {
      result.push("warnings");
    }

    if (
      (currentForm.getAcceptWarnings && formSection.acceptWarnings !== currentForm.getAcceptWarnings()) ||
      currentFormHasChanges(currentForm, values)
    ) {
      result.push("changes");
    }
  }

  return result;
}
