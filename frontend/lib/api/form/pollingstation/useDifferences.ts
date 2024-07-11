import * as React from "react";

import {
  DifferencesCounts,
  usePollingStationFormController,
  ValidationResult,
} from "@kiesraad/api";
import { matchValidationResultWithFormSections } from "@kiesraad/util";

export function useDifferences() {
  const {
    values,
    setValues,
    data,
    loading,
    error: serverError,
    setTemporaryCache,
    cache,
  } = usePollingStationFormController();

  const sectionValues = React.useMemo(() => {
    if (cache && cache.key === "differences") {
      const data = cache.data;
      setTemporaryCache(null);
      return data;
    }
    return {
      differences_counts: values.differences_counts,
    };
  }, [values, setTemporaryCache, cache]);

  const errors = React.useMemo(() => {
    if (data) {
      return data.validation_results.errors.filter((err) =>
        matchValidationResultWithFormSections(err.fields, ["differences_votes"]),
      );
    }
    return [] as ValidationResult[];
  }, [data]);

  const warnings = React.useMemo(() => {
    if (data) {
      return data.validation_results.warnings.filter((warning) =>
        matchValidationResultWithFormSections(warning.fields, ["differences_votes"]),
      );
    }
    return [] as ValidationResult[];
  }, [data]);

  const setSectionValues = (values: DifferencesCounts) => {
    setValues((old) => ({
      ...old,
      differences_counts: {
        ...values,
      },
    }));
  };

  const isCalled = React.useMemo(() => {
    // TODO: How to know if this is called, all values can be 0?
    // if (sectionValues.differences_counts... > 0) {
    //   return true;
    // }
    return false;
  }, []);

  return {
    loading,
    sectionValues,
    setSectionValues,
    errors,
    warnings,
    isCalled,
    serverError,
    setTemporaryCache,
  };
}
