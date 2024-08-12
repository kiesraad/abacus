import * as React from "react";
import { BlockerFunction, useBlocker, useNavigate, useParams } from "react-router-dom";

import {
  AnyFormReference,
  currentFormHasChanges,
  FormSectionID,
  FormState,
  PollingStationValues,
  useElection,
  usePollingStationFormController,
} from "@kiesraad/api";
import { Button, Feedback, Modal } from "@kiesraad/ui";

export function PollingStationFormNavigation() {
  const _lastKnownSection = React.useRef<FormSectionID | null>(null);
  const {
    formState,
    error,
    currentForm,
    targetFormSection,
    values,
    setTemporaryCache,
    submitCurrentForm,
  } = usePollingStationFormController();
  const { pollingStationId } = useParams();
  const { election } = useElection();
  const navigate = useNavigate();

  const getUrlForFormSection = React.useCallback(
    (id: FormSectionID) => {
      const baseUrl = `/${election.id}/input/${pollingStationId}`;
      let url: string = "";
      if (id.startsWith("political_group_votes_")) {
        url = `${baseUrl}/list/${id.replace("political_group_votes_", "")}`;
      } else {
        switch (id) {
          case "recounted":
            url = `${baseUrl}/recounted`;
            break;
          case "differences_counts":
            url = `${baseUrl}/differences`;
            break;
          case "voters_votes_counts":
            url = `${baseUrl}/numbers`;
            break;
        }
      }

      return url;
    },
    [election, pollingStationId],
  );

  const shouldBlock = React.useCallback<BlockerFunction>(
    ({ currentLocation, nextLocation }) => {
      if (currentLocation.pathname === nextLocation.pathname) {
        return false;
      }
      if (!currentForm) {
        return false;
      }

      //check if currentForm is before or same as current;

      const reason = reasonBlocked(formState, currentForm, values);
      if (reason !== null) {
        if (reason === "changes" && formState.active === formState.current) {
          console.log("caching: ", currentForm.id);
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
    [formState, currentForm, setTemporaryCache, values],
  );

  const blocker = useBlocker(shouldBlock);

  React.useEffect(() => {
    console.log("Setting current", formState.active);
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
    if (targetFormSection !== _lastKnownSection.current) {
      _lastKnownSection.current = targetFormSection;

      const url = getUrlForFormSection(targetFormSection);
      navigate(url);
    }
  }, [targetFormSection, getUrlForFormSection, navigate]);

  //TODO: handle server error

  return (
    <>
      {blocker.state === "blocked" && (
        <Modal
          onClose={() => {
            blocker.proceed();
          }}
        >
          <h2>Wat wil je doen met je invoer?</h2>
          <p>TEMP: {currentForm && reasonBlocked(formState, currentForm, values)}</p>
          <p>
            Ga je op een later moment verder met het invoeren van dit stembureau? Dan kan je de
            invoer die je al hebt gedaan bewaren.
            <br />
            <br />
            Twijfel je? Overleg dan met de coördinator.
          </p>
          <nav>
            <Button
              size="lg"
              onClick={() => {
                blocker.reset();
                submitCurrentForm();
              }}
            >
              Invoer bewaren
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

      {error && (
        <Feedback type="error" title="Controleer uitgebrachte stemmen">
          <div id="feedback-server-error">
            {error.errorCode}: {error.message}
          </div>
        </Feedback>
      )}
      {error && <div>Error: {error.message}</div>}
    </>
  );
}

type BlockReason = "errors" | "warnings" | "changes";

function reasonBlocked(
  formState: FormState,
  currentForm: AnyFormReference,
  values: PollingStationValues,
): BlockReason | null {
  const formSection = formState.sections[currentForm.id];
  if (formSection) {
    if (formSection.errors.length > 0) {
      console.log("BLOCKED: has errors");
      return "errors";
    }
    if (formSection.warnings.length > 0 && !formSection.ignoreWarnings) {
      console.log("BLOCKED: has warnings without ignore");
      return "warnings";
    }
    console.log("Checking changes!!!");
    if (!formSection.isSubmitted && currentFormHasChanges(currentForm, values)) {
      console.log("BLOCKED: has changes");
      return "changes";
    }
  }

  return null;
}
