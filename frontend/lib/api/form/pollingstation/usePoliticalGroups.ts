import * as React from "react";

import { usePollingStationFormController } from "./usePollingStationFormController";
import { PoliticalGroupVotes, ValidationResult } from "../../gen/openapi";

export function usePoliticalGroup(political_group_number: number) {
  const {
    values,
    setValues,
    data,
    loading,
    error: serverError,
  } = usePollingStationFormController();

  const sectionValues = React.useMemo(() => {
    return values.political_group_votes.find((pg) => pg.number === political_group_number);
  }, [values, political_group_number]);

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

  return {
    sectionValues,
    setSectionValues,
    errors,
    warnings,
    loading,
    serverError,
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
