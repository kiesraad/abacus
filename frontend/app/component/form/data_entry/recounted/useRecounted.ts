import { useEffect, useRef, useState } from "react";

import { PollingStationResults } from "@kiesraad/api";
import { useFormKeyboardNavigation } from "@kiesraad/ui";

import { useDataEntryContext } from "../state/useDataEntryContext";
import { SubmitCurrentFormOptions } from "../state/types";

export type RecountedValue = Pick<PollingStationResults, "recounted">;

export function useRecounted() {
  const { status, pollingStationResults, formState, onSubmitForm } = useDataEntryContext({
    id: "recounted",
    type: "recounted",
  });

  // derived state
  const { errors, warnings, isSaved } = formState.sections.recounted;
  const hasValidationError = errors.length > 0;

  // local state
  const [recounted, setRecounted] = useState<boolean | undefined>(pollingStationResults.recounted);

  // submit and save to form contents
  const onSubmit = async (options?: SubmitCurrentFormOptions): Promise<boolean> => {
    const data: Partial<PollingStationResults> = { recounted };

    if (!pollingStationResults.voters_recounts && recounted) {
      data.voters_recounts = {
        poll_card_count: 0,
        proxy_certificate_count: 0,
        voter_card_count: 0,
        total_admitted_voters_count: 0,
      };
    }

    return onSubmitForm(data, options);
  };

  // form keyboard navigation
  const formRef = useRef<HTMLFormElement>(null);
  useFormKeyboardNavigation(formRef);

  // scroll to top when saved
  useEffect(() => {
    if (isSaved) {
      window.scrollTo(0, 0);
    }
  }, [isSaved, warnings, errors]);

  return {
    status,
    formRef,
    recounted,
    setRecounted,
    pollingStationResults,
    errors,
    warnings,
    hasValidationError,
    isSaved,
    isSaving: status === "saving",
    onSubmit,
  };
}
