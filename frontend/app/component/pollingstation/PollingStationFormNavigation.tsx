import * as React from "react";
import { BlockerFunction, useBlocker, useNavigate, useParams } from "react-router-dom";

import { FormSectionID, useElection, usePollingStationFormController } from "@kiesraad/api";
import { Button, Modal } from "@kiesraad/ui";

export function PollingStationFormNavigation() {
  const _lastKnownSection = React.useRef<FormSectionID | null>(null);
  const { formState, error, currentForm } = usePollingStationFormController();
  const { pollingStationId } = useParams();
  const { election } = useElection();
  const navigate = useNavigate();

  const baseUrl = React.useMemo(() => {
    return `/${election.id}/input/${pollingStationId}`;
  }, [election, pollingStationId]);

  const shouldBlock = React.useCallback<BlockerFunction>(
    ({ currentLocation, nextLocation }) => {
      //TODO: share logic with modal displaying.
      if (currentLocation.pathname === nextLocation.pathname) {
        console.log("Path same");
        return false;
      }
      if (!currentForm) {
        return false;
      }

      const formSection = formState.sections[currentForm.id];
      if (formSection) {
        if (formSection.errors.length > 0) {
          console.log("BLOCKED: has errors");
          return true;
        }
        if (formSection.warnings.length > 0 && !currentForm.ignoreWarnings()) {
          console.log("BLOCKED: has warnings without ignore");
          return true;
        }
      }

      //check if values have changed

      return false;
    },
    [formState, currentForm],
  );

  const blocker = useBlocker(shouldBlock);

  React.useEffect(() => {
    if (_lastKnownSection.current === null) {
      console.log("Setting last known section to", formState.active);
      _lastKnownSection.current = formState.active;
    }
    if (formState.active !== _lastKnownSection.current) {
      console.log("Navigating to", formState.active);
      _lastKnownSection.current = formState.active;
      let url: string = "";
      if (formState.active.startsWith("political_group_votes_")) {
        url = `${baseUrl}/list/${formState.active.replace("political_group_votes_", "")}`;
      } else {
        switch (formState.active) {
          case "differences_counts":
            url = `${baseUrl}/differences`;
            break;
          case "voters_votes_counts":
            url = `${baseUrl}/numbers`;
            break;
        }
      }
      navigate(url);
    }
  }, [formState, baseUrl, navigate]);

  //TODO: handle server error

  return (
    <>
      {blocker.state === "blocked" && (
        <Modal onClose={() => {}}>
          <h2>Wat wil je doen met je invoer?</h2>
          <p>
            Ga je op een later moment verder met het invoeren van dit stembureau? Dan kan je de
            invoer die je al hebt gedaan bewaren.
            <br />
            <br />
            Twijfel je? Overleg dan met de coördinator.
          </p>
          <nav>
            <Button size="lg">Invoer bewaren</Button>
            <Button size="lg" variant="secondary">
              Niet bewaren
            </Button>
          </nav>
        </Modal>
      )}
      {error && <div>Error: {error.message}</div>}
    </>
  );
}
