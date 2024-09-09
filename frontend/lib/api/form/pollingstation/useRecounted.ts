import * as React from "react";

import { PollingStationValues, usePollingStationFormController } from "@kiesraad/api";

export type RecountedValue = Pick<PollingStationValues, "recounted">;

export function useRecounted(getValues: () => RecountedValue) {
  const {
    status,
    values,
    formState,
    submitCurrentForm,
    setTemporaryCache,
    registerCurrentForm,
    cache,
  } = usePollingStationFormController();

  const sectionValues = React.useMemo(() => {
    if (cache && cache.key === "recounted") {
      const data = cache.data as RecountedValue;
      setTemporaryCache(null);
      return data;
    }
    return { recounted: values.recounted };
  }, [values, setTemporaryCache, cache]);

  const errors = React.useMemo(() => {
    return formState.sections.recounted.errors;
  }, [formState]);

  const warnings = React.useMemo(() => {
    return formState.sections.recounted.warnings;
  }, [formState]);

  React.useEffect(() => {
    registerCurrentForm({
      id: "recounted",
      type: "recounted",
      getValues,
    });
  }, [registerCurrentForm, getValues]);

  return {
    status,
    sectionValues,
    errors,
    warnings,
    isSaved: formState.sections.recounted.isSaved,
    submit: submitCurrentForm,
  };
}
