import * as React from "react";

import { Recounted, usePollingStationFormController, ValidationResult } from "@kiesraad/api";
import { matchValidationResultWithFormSections } from "@kiesraad/util";

export function useRecounted() {
  const { values, setValues, data, loading, error, setTemporaryCache, cache } =
    usePollingStationFormController();

  const sectionValues: Recounted = React.useMemo(() => {
    if (cache && cache.key === "recounted") {
      const data = cache.data;
      setTemporaryCache(null);
      return data;
    }
    return {
      yes: values.recounted !== undefined ? values.recounted : false,
      no: values.recounted !== undefined ? !values.recounted : false,
    };
  }, [values, setTemporaryCache, cache]);

  const errors = React.useMemo(() => {
    if (data) {
      return data.validation_results.errors.filter((err) =>
        matchValidationResultWithFormSections(err.fields, ["recounted"]),
      );
    }
    return [] as ValidationResult[];
  }, [data]);

  const warnings = React.useMemo(() => {
    if (data) {
      return data.validation_results.warnings.filter((warning) =>
        matchValidationResultWithFormSections(warning.fields, ["recounted"]),
      );
    }
    return [] as ValidationResult[];
  }, [data]);

  const setSectionValues = (values: Recounted) => {
    setValues((old) => ({
      ...old,
      recounted: values.yes || !values.no,
      voters_recounts:
        values.yes && old.voters_recounts
          ? {
              ...old.voters_recounts,
            }
          : undefined,
    }));
  };

  const isCalled = React.useMemo(() => {
    return sectionValues.yes || sectionValues.no;
  }, [sectionValues]);

  return {
    loading,
    sectionValues,
    setSectionValues,
    errors,
    warnings,
    isCalled,
    serverError: error,
    setTemporaryCache,
  };
}
