import * as React from "react";

import {
  PoliticalGroupVotes,
  usePollingStationFormController,
  ValidationResult,
} from "@kiesraad/api";
import { matchValidationResultWithFormSections } from "@kiesraad/util";

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
        matchValidationResultWithFormSections(err.fields, ["political_group_votes"]),
      );
    }
    return [] as ValidationResult[];
  }, [data]);

  const warnings = React.useMemo(() => {
    if (data) {
      return data.validation_results.warnings.filter((warning) =>
        matchValidationResultWithFormSections(warning.fields, ["political_group_votes"]),
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
    return !!(sectionValues && sectionValues.total);
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
