import * as React from "react";
import { BlockerFunction, useBlocker, useNavigate } from "react-router-dom";

import { AbortDataEntryModal } from "app/module/data_entry/PollingStation/AbortDataEntryModal";

import {
  AnyFormReference,
  currentFormHasChanges,
  Election,
  FormSectionID,
  FormState,
  PollingStationValues,
  usePollingStationFormController,
} from "@kiesraad/api";
import { Button, Feedback, Modal } from "@kiesraad/ui";

import { getUrlForFormSectionID } from "./utils";

export interface PollingStationFormNavigationProps {
  pollingStationId: number;
  election: Required<Election>;
}

export function PollingStationFormNavigation({ pollingStationId, election }: PollingStationFormNavigationProps) {
  const _lastKnownSection = React.useRef<FormSectionID | null>(null);
  const { status, formState, apiError, currentForm, targetFormSection, values, setTemporaryCache, submitCurrentForm } =
    usePollingStationFormController();

  const navigate = useNavigate();
  //one time flag to prioritize user navigation over controller navigation
  const overrideControllerNavigation = React.useRef<string | null>(null);

  const isPartOfDataEntryFlow = React.useCallback(
    (pathname: string) => pathname.startsWith(`/elections/${election.id}/data-entry/${pollingStationId}/`),
    [election, pollingStationId],
  );

  const getUrlForFormSection = React.useCallback(
    (id: FormSectionID) => {
      return getUrlForFormSectionID(election.id, pollingStationId, id);
    },
    [election, pollingStationId],
  );

  const shouldBlock = React.useCallback<BlockerFunction>(
    ({ currentLocation, nextLocation }) => {
      if (
        status.current === "deleted" ||
        status.current === "finalised" ||
        currentLocation.pathname === nextLocation.pathname ||
        !currentForm
      ) {
        return false;
      }

      //check if nextLocation is outside the data entry flow
      if (status.current !== "aborted" && !isPartOfDataEntryFlow(nextLocation.pathname)) {
        return true;
      }

      const reasons = reasonsBlocked(formState, currentForm, values);
      //currently only block on changes
      if (reasons.includes("changes")) {
        if (formState.active === formState.current) {
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
    const activeSection = formState.sections[formState.active];
    const currentSection = formState.sections[formState.current];
    if (activeSection && currentSection) {
      if (activeSection.index > currentSection.index) {
        const url = getUrlForFormSection(currentSection.id);
        navigate(url);
      }
    }
    _lastKnownSection.current = formState.active;
  }, [formState, navigate, getUrlForFormSection]);

  //check if the targetFormSection has changed and navigate to the correct url
  React.useEffect(() => {
    if (!targetFormSection) return;
    if (overrideControllerNavigation.current) {
      const url = overrideControllerNavigation.current;
      overrideControllerNavigation.current = null;
      navigate(url);
      return;
    }
    if (targetFormSection !== _lastKnownSection.current) {
      _lastKnownSection.current = targetFormSection;
      const url = getUrlForFormSection(targetFormSection);
      navigate(url);
    }
  }, [targetFormSection, getUrlForFormSection, navigate]);

  // scroll up when an error occurs
  React.useEffect(() => {
    if (apiError) {
      window.scrollTo(0, 0);
    }
  }, [apiError]);

  const onSave = () =>
    void (async () => {
      if (blocker.location) overrideControllerNavigation.current = blocker.location.pathname;
      await submitCurrentForm();
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
              onClose={() => {
                blocker.reset();
              }}
            >
              <h2 id="modal-blocker-title">Let op: niet opgeslagen wijzigingen</h2>
              <p>
                Je hebt in <strong>{formState.sections[formState.active]?.title || "het huidige formulier"}</strong>{" "}
                wijzigingen gemaakt die nog niet zijn opgeslagen.
              </p>
              <p>Wil je deze wijzigingen bewaren?</p>
              <nav>
                <Button size="lg" onClick={onSave}>
                  Wijzigingen opslaan
                </Button>
                <Button
                  size="lg"
                  variant="secondary"
                  onClick={() => {
                    blocker.proceed();
                  }}
                >
                  Niet bewaren
                </Button>
              </nav>
            </Modal>
          )}
        </>
      )}

      {apiError && <Feedback id="feedback-server-error" type="error" apiError={apiError} />}
    </>
  );
}

type BlockReason = "errors" | "warnings" | "changes";

function reasonsBlocked(
  formState: FormState,
  currentForm: AnyFormReference,
  values: PollingStationValues,
): BlockReason[] {
  const result: BlockReason[] = [];

  const formSection = formState.sections[currentForm.id];
  if (formSection) {
    if (formSection.errors.length > 0) {
      result.push("errors");
    }
    if (formSection.warnings.length > 0 && !formSection.ignoreWarnings) {
      result.push("warnings");
    }

    if (
      (currentForm.getIgnoreWarnings && formSection.ignoreWarnings !== currentForm.getIgnoreWarnings()) ||
      currentFormHasChanges(currentForm, values)
    ) {
      result.push("changes");
    }
  }

  return result;
}
