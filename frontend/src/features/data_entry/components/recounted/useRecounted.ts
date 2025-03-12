import { useEffect, useRef, useState } from "react";

import { useFormKeyboardNavigation } from "@/components/ui";
import { SubmitCurrentFormOptions } from "@/features/data_entry/stores/types";
import { useDataEntryContext } from "@/features/data_entry/stores/useDataEntryContext";
import { PollingStationResults } from "@/types/generated/openapi";

export type RecountedValue = Pick<PollingStationResults, "recounted">;

export function useRecounted() {
  const { error, status, pollingStationResults, formState, onSubmitForm, updateFormSection } = useDataEntryContext({
    id: "recounted",
    type: "recounted",
  });

  // local state
  const [recounted, _setRecounted] = useState<boolean | undefined>(pollingStationResults.recounted);

  // derived state
  const { errors, warnings, isSaved, hasChanges } = formState.sections.recounted;
  const hasValidationError = errors.length > 0;

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
    if (isSaved || error) {
      window.scrollTo(0, 0);
    }
  }, [isSaved, error]);

  const setRecounted = (value: boolean) => {
    if (!hasChanges) {
      updateFormSection({ hasChanges: true, acceptWarnings: false, acceptWarningsError: false });
    }
    _setRecounted(value);
  };

  return {
    error,
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
