import * as React from "react";

import { PollingStationResults } from "@kiesraad/api";

import { usePollingStationFormController } from "../usePollingStationFormController";

export type DifferencesValues = Pick<PollingStationResults, "differences_counts">;

export function useDifferences(getValues: () => DifferencesValues, getAcceptWarnings?: () => boolean) {
  const { status, values, formState, submitCurrentForm, setTemporaryCache, registerCurrentForm, cache } =
    usePollingStationFormController();

  const sectionValues = React.useMemo(() => {
    if (cache && cache.key === "differences_counts") {
      const data = cache.data as DifferencesValues;
      setTemporaryCache(null);
      return data;
    }

    return {
      differences_counts: values.differences_counts,
    };
  }, [values, setTemporaryCache, cache]);

  const errors = React.useMemo(() => {
    return formState.sections.differences_counts.errors;
  }, [formState]);

  const warnings = React.useMemo(() => {
    return formState.sections.differences_counts.warnings;
  }, [formState]);

  React.useEffect(() => {
    registerCurrentForm({
      id: "differences_counts",
      type: "differences",
      getValues,
      getAcceptWarnings: getAcceptWarnings,
    });
  }, [registerCurrentForm, getValues, getAcceptWarnings]);

  return {
    status,
    sectionValues,
    errors,
    warnings,
    isSaved: formState.sections.differences_counts.isSaved,
    submit: submitCurrentForm,
    acceptWarnings: formState.sections.differences_counts.acceptWarnings,
  };
}
