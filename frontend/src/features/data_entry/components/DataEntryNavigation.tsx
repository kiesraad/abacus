import { useBlocker, useParams } from "react-router";

import { ApiError, FatalApiError } from "@/api/ApiResult";
import { IconTrash } from "@/components/generated/icons";
import { Button } from "@/components/ui/Button/Button";
import { Modal } from "@/components/ui/Modal/Modal";
import { useUser } from "@/hooks/user/useUser";
import { t, tx } from "@/i18n/translate";
import type { FormSectionId, SectionValues } from "@/types/types";

import { useDataEntryContext } from "../hooks/useDataEntryContext";
import type { SubmitCurrentFormOptions } from "../types/types";
import { redirectToHomePageErrorReferences } from "../utils/errors";

export interface DataEntryNavigationProps {
  onSubmit: (options?: SubmitCurrentFormOptions) => Promise<boolean>;
  currentValues?: SectionValues;
}

// biome-ignore lint/complexity/noExcessiveLinesPerFunction: TODO function should be refactored
export function DataEntryNavigation({ onSubmit, currentValues = {} }: DataEntryNavigationProps) {
  const {
    error,
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
  const params = useParams<{ sectionId: FormSectionId }>();
  const sectionId = params.sectionId ?? null;
  const user = useUser();

  // path check to see if the current location is part of the data entry flow
  const isPartOfDataEntryFlow = (pathname: string) =>
    pathname.startsWith(`/elections/${election.id}/data-entry/${pollingStationId}/${entryNumber}`);

  // block navigation if there are unsaved changes
  const blocker = useBlocker(({ currentLocation, nextLocation }) => {
    // do not block when user is logged out or an error is redirecting to the data entry home page
    if (
      user === null ||
      (error instanceof FatalApiError && error.reference === "CommitteeSessionPaused") ||
      (error instanceof ApiError && redirectToHomePageErrorReferences.includes(error.reference))
    ) {
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

    const formSection = sectionId ? formState.sections[sectionId] : null;
    if (formSection?.hasChanges) {
      if (sectionId === formState.furthest) {
        setCache({
          key: sectionId,
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
    if (sectionId === "save") {
      blocker.proceed();
    } else if (await onSubmit({ aborting: true, continueToNextSection: false, showAcceptErrorsAndWarnings: false })) {
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
    if (sectionId) {
      updateFormSection(sectionId, { hasChanges: false });
    }
    blocker.proceed();
  };

  // when unsaved changes are detected and navigating within the data entry flow
  if (isPartOfDataEntryFlow(blocker.location.pathname)) {
    const title = dataEntryStructure.find((s) => s.id === sectionId)?.title || t("polling_station.current_form");
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
            type="button"
            onClick={() => {
              void onModalSave();
            }}
          >
            {t("save_changes")}
          </Button>
          <Button
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
          leftIcon={<IconTrash />}
          size="lg"
          variant="tertiary-destructive"
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
