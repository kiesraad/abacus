import * as React from "react";

import { PollingStationResults, usePollingStationFormController } from "@kiesraad/api";

export type DifferencesValues = Pick<PollingStationResults, "differences_counts">;

export function useDifferences(
  getValues: () => DifferencesValues,
  getIgnoreWarnings?: () => boolean,
) {
  const {
    saving,
    values,
    formState,
    submitCurrentForm,
    setTemporaryCache,
    registerCurrentForm,
    cache,
  } = usePollingStationFormController();

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
      getIgnoreWarnings,
    });
  }, [registerCurrentForm, getValues, getIgnoreWarnings]);

  return {
    saving,
    sectionValues,
    errors,
    warnings,
    isSaved: formState.sections.differences_counts.isSaved,
    submit: submitCurrentForm,
    isCompleted: formState.isCompleted,
    ignoreWarnings: formState.sections.differences_counts.ignoreWarnings,
  };
}
