import { useBlocker } from "react-router";

import { Button } from "@/components/ui/Button/Button";
import { Modal } from "@/components/ui/Modal/Modal";
import { useUser } from "@/hooks/user/useUser";
import { t, tx } from "@/i18n/translate";

import { useElectionCreateContext } from "../hooks/useElectionCreateContext";

export function AbortModal() {
  const { state, dispatch } = useElectionCreateContext();
  const user = useUser();

  // path check to see if the current location is part of the create election flow
  const isPartOfCreateElectionFlow = (pathname: string) => pathname.startsWith(`/elections/create`);

  // block navigation if there are unsaved changes
  const blocker = useBlocker(({ nextLocation }) => {
    // do not block when user is logged out / the session expired
    if (user === null) {
      return false;
    }

    // do not block when no election was started yet,
    // or when a new election was just created
    if (!state.election) {
      return false;
    }

    // do not block when navigating after saving
    if (nextLocation.state && "success" in nextLocation.state) {
      return false;
    }

    // check if nextLocation is outside the create election flow
    return !isPartOfCreateElectionFlow(nextLocation.pathname);
  });

  // Do not show modal when state is not blocked
  if (blocker.state !== "blocked") {
    return null;
  }

  // when cancel was chosen, stay on the page
  const onAbortModalCancel = () => {
    blocker.reset();
  };

  // when delete was chosen, clear state and proceed
  const onAbortModalDelete = () => {
    dispatch({ type: "RESET" });
    blocker.proceed();
  };

  return (
    <Modal
      title={t("election.abort.title")}
      onClose={() => {
        blocker.reset();
      }}
    >
      {tx("election.abort.description")}
      <nav>
        <Button
          size="xl"
          variant="primary-destructive"
          onClick={() => {
            onAbortModalDelete();
          }}
          type="button"
        >
          {t("election.abort.discard_input")}
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            onAbortModalCancel();
          }}
          type="button"
        >
          {t("election.abort.keep_input")}
        </Button>
      </nav>
    </Modal>
  );
}
