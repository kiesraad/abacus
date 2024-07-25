import * as React from "react";

import { Button, Modal } from "@kiesraad/ui";
import { usePollingStationFormController, FormSectionID, useElection } from "@kiesraad/api";
import { useNavigate, useParams, useBlocker, BlockerFunction } from "react-router-dom";

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
      if (currentLocation.pathname === nextLocation.pathname) {
        console.log("Path same");
        return false;
      }
      if (!currentForm) {
        return false;
      }

      console.log("HUH", currentForm.id);
      const formSection = formState.sections[currentForm.id];
      if (formSection) {
        console.log("BLA", formState.active, formState.current, formSection.id);
        if (formSection.errors.length > 0) {
          return true;
        } else {
          if (formState.active !== formState.current) {
            console.log("Cache this section", formState.current);
            return false;
          }
        }
      }

      return false;
    },
    [formState, currentForm],
  );

  const blocker = useBlocker(shouldBlock);

  React.useEffect(() => {
    if (formState.active !== _lastKnownSection.current) {
      console.log("Navigating to", formState.active);
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
