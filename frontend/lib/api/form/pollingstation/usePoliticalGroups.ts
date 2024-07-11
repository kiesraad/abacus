import * as React from "react";

import {
  PoliticalGroupVotes,
  usePollingStationFormController,
  ValidationResult,
} from "@kiesraad/api";

export function usePoliticalGroup(political_group_number: number) {
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
    if (cache && cache.key === "political_group_votes" && cache.id === political_group_number) {
      const data = cache.data;
      setTemporaryCache(null);
      return data;
    }
    return values.political_group_votes.find((pg) => pg.number === political_group_number);
  }, [values, political_group_number, setTemporaryCache, cache]);

  const errors = React.useMemo(() => {
    if (data) {
      return data.validation_results.errors.filter((err) =>
        isInSection(["political_group_votes"], err.fields),
      );
    }
    return [] as ValidationResult[];
  }, [data]);

  const warnings = React.useMemo(() => {
    if (data) {
      return data.validation_results.warnings.filter((warning) =>
        isInSection(["political_group_votes"], warning.fields),
      );
    }
    return [] as ValidationResult[];
  }, [data]);

  const setSectionValues = (values: PoliticalGroupVotes) => {
    setValues((old) => ({
      ...old,
      political_group_votes: old.political_group_votes.map((pg) => {
        if (pg.number === political_group_number) {
          return values;
        }
        return pg;
      }),
    }));
  };

  const isCalled = React.useMemo(() => {
    if (sectionValues && sectionValues.total) {
      return true;
    }
    return false;
  }, [sectionValues]);

  return {
    sectionValues,
    setSectionValues,
    errors,
    warnings,
    loading,
    isCalled,
    serverError,
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
