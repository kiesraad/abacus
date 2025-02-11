import { useBlocker } from "react-router";

import { PollingStationResults } from "@kiesraad/api";
import { t, tx } from "@kiesraad/i18n";
import { Button, Modal } from "@kiesraad/ui";

import { SubmitCurrentFormOptions } from "../form/data_entry/state/types";
import { useDataEntryContext } from "../form/data_entry/state/useDataEntryContext";

export interface PollingStationFormNavigationProps {
  onSubmit: (options?: SubmitCurrentFormOptions) => Promise<boolean>;
  currentValues: Partial<PollingStationResults>;
}

export function PollingStationFormNavigation({ onSubmit, currentValues }: PollingStationFormNavigationProps) {
  const { status, election, pollingStationId, formState, setCache, entryNumber, onDeleteDataEntry } =
    useDataEntryContext();

  // path check to see if the current location is part of the data entry flow
  const isPartOfDataEntryFlow = (pathname: string) =>
    pathname.startsWith(`/elections/${election.id}/data-entry/${pollingStationId}/${entryNumber}`);

  // block navigation if there are unsaved changes
  const blocker = useBlocker(({ currentLocation, nextLocation }) => {
    if (
      status === "deleted" ||
      status === "finalised" ||
      status === "aborted" ||
      currentLocation.pathname === nextLocation.pathname
    ) {
      return false;
    }

    // check if nextLocation is outside the data entry flow
    if (!isPartOfDataEntryFlow(nextLocation.pathname)) {
      return true;
    }

    const formSection = formState.sections[formState.current];
    if (formSection?.hasChanges) {
      if (formState.current === formState.furthest) {
        setCache({
          key: formState.current,
          data: currentValues,
        });

        return false;
      }

      return true;
    }

    return false;
  });

  if (blocker.state !== "blocked") {
    return null;
  }

  // when save is chosen in the abort dialog
  const onAbortModalSave = async () => {
    if (await onSubmit({ continueToNextSection: false })) {
      blocker.proceed();
    } else {
      blocker.reset();
    }
  };

  // when unsaved changes are detected and navigating within the data entry flow
  if (isPartOfDataEntryFlow(blocker.location.pathname)) {
    return (
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
          <Button
            size="lg"
            type="button"
            onClick={() => {
              void onAbortModalSave();
            }}
          >
            {t("save_changes")}
          </Button>
          <Button
            size="lg"
            variant="secondary"
            type="button"
            onClick={() => {
              blocker.proceed();
            }}
          >
            {t("do_not_save")}
          </Button>
        </nav>
      </Modal>
    );
  }

  // when discard is chosen in the abort dialog
  const onAbortModalDelete = async () => {
    if (await onDeleteDataEntry()) {
      blocker.proceed();
    } else {
      blocker.reset();
    }
  };

  // when unsaved changes are detected and navigating outside the data entry flow
  return (
    <Modal
      title={t("data_entry.abort.title")}
      onClose={() => {
        blocker.reset();
      }}
    >
      {tx("data_entry.abort.description")}
      <nav>
        <Button
          size="lg"
          onClick={() => {
            void onAbortModalSave();
          }}
          type="button"
          disabled={status === "saving"}
        >
          {t("data_entry.abort.save_input")}
        </Button>
        <Button
          size="lg"
          variant="secondary"
          onClick={() => {
            void onAbortModalDelete();
          }}
          type="button"
          disabled={status === "deleting"}
        >
          {t("data_entry.abort.discard_input")}
        </Button>
      </nav>
    </Modal>
  );
}
