import * as React from "react";

import { PollingStationResults, usePollingStationFormController } from "@kiesraad/api";

export type DifferencesValues = Pick<PollingStationResults, "differences_counts">;

export function useDifferences(getValues: () => DifferencesValues) {
  const {
    values,
    formState,
    loading,
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
    });
  }, [registerCurrentForm, getValues]);

  return {
    loading,
    sectionValues,
    errors,
    warnings,
    isSaved: formState.sections.differences_counts.isSaved,
    submit: submitCurrentForm,
    isCompleted: formState.isCompleted,
  };
}
