import { useBlocker } from "react-router";

import { Button } from "@/components/ui/Button/Button";
import { Modal } from "@/components/ui/Modal/Modal";
import { useUser } from "@/hooks/user/useUser";
import { t, tx } from "@/i18n/translate";

import { useDataEntryContext } from "../hooks/useDataEntryContext";
import { SectionValues, SubmitCurrentFormOptions } from "../types/types";

export interface DataEntryNavigationProps {
  onSubmit: (options?: SubmitCurrentFormOptions) => Promise<boolean>;
  currentValues?: SectionValues;
}

export function DataEntryNavigation({ onSubmit, currentValues = {} }: DataEntryNavigationProps) {
  const {
    status,
    election,
    pollingStationId,
    dataEntryStructure,
    formState,
    setCache,
    entryNumber,
    onDeleteDataEntry,
    updateFormSection,
  } = useDataEntryContext();
  const user = useUser();

  // path check to see if the current location is part of the data entry flow
  const isPartOfDataEntryFlow = (pathname: string) =>
    pathname.startsWith(`/elections/${election.id}/data-entry/${pollingStationId}/${entryNumber}`);

  // block navigation if there are unsaved changes
  const blocker = useBlocker(({ currentLocation, nextLocation }) => {
    // do not block when user is logged out / the session expired
    if (user === null) {
      return false;
    }

    if (
      status === "deleted" ||
      status === "finalising" ||
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

  const onModalSave = async () => {
    if (await onSubmit({ aborting: false, continueToNextSection: false, showAcceptErrorsAndWarnings: false })) {
      blocker.proceed();
    } else {
      blocker.reset();
    }
  };
  // when save is chosen in the abort dialog
  const onAbortModalSave = async () => {
    if (await onSubmit({ aborting: true, continueToNextSection: false, showAcceptErrorsAndWarnings: false })) {
      blocker.proceed();
    } else {
      if (status === "aborted") {
        blocker.proceed();
      } else {
        blocker.reset();
      }
    }
  };

  const onModalDoNoSave = () => {
    updateFormSection({ hasChanges: false });
    blocker.proceed();
  };

  // when unsaved changes are detected and navigating within the data entry flow
  if (isPartOfDataEntryFlow(blocker.location.pathname)) {
    const title =
      dataEntryStructure.find((s) => s.id === formState.current)?.title || t("polling_station.current_form");
    return (
      <Modal
        title={t("polling_station.unsaved_changes_title")}
        onClose={() => {
          blocker.reset();
        }}
      >
        <p>{tx("polling_station.unsaved_changes_message", {}, { name: title })}</p>
        <p>{t("polling_station.save_changes")}</p>
        <nav>
          <Button
            size="lg"
            type="button"
            onClick={() => {
              void onModalSave();
            }}
          >
            {t("save_changes")}
          </Button>
          <Button
            size="lg"
            variant="secondary"
            type="button"
            onClick={() => {
              onModalDoNoSave();
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
