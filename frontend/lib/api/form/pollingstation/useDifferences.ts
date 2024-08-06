import * as React from "react";

import { DifferencesCounts, usePollingStationFormController } from "@kiesraad/api";

export function useDifferences(getValues: () => DifferencesCounts) {
  const {
    values,
    formState,
    loading,
    submitCurrentForm,
    setTemporaryCache,
    registerCurrentForm,
    cache,
  } = usePollingStationFormController();

  const sectionValues: DifferencesCounts = React.useMemo(() => {
    if (cache && cache.key === "differences_counts") {
      const data = cache.data as DifferencesCounts;
      setTemporaryCache(null);
      return data;
    }
    return values.differences_counts;
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
  };
}
