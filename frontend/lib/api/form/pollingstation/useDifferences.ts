import * as React from "react";

import {
  DifferencesCounts,
  usePollingStationFormController,
  ValidationResult,
} from "@kiesraad/api";

export function useDifferences() {
  const { values, setValues, loading, error, data, setTemporaryCache, cache } =
    usePollingStationFormController();

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
        isInSection(["differences_counts"], err.fields),
      );
    }
    return [] as ValidationResult[];
  }, [data]);

  const warnings = React.useMemo(() => {
    if (data) {
      return data.validation_results.warnings.filter((warning) =>
        isInSection(["differences_counts"], warning.fields),
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
    serverError: error,
    isCalled,
    setTemporaryCache,
  };
}

function isInSection(keys: string[], fields: string[]) {
  for (let i = 0; i < fields.length; i++) {
    const field = fields[i];
    for (let j = 0; j < keys.length; j++) {
      const key = keys[j];
      if (field && key && field.startsWith(key)) {
        return true;
      }
    }
  }
  return false;
}
