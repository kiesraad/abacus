import * as React from "react";

import { PollingStationResults, ValidationResult } from "../../gen/openapi";
import { usePollingStationFormController } from "./usePollingStationFormController";

type VotersAndVotesValues = Pick<PollingStationResults, "voters_counts" | "votes_counts">;

export function useVotersAndVotes() {
  const { values, setValues, loading, error, data } = usePollingStationFormController();

  const sectionValues = React.useMemo(() => {
    return {
      voters_counts: values.voters_counts,
      votes_counts: values.votes_counts,
    };
  }, [values]);

  const errors = React.useMemo(() => {
    if (data) {
      return data.validation_results.errors.filter((err) =>
        isInSection(["voters_counts", "votes_counts"], err.fields),
      );
    }
    return [] as ValidationResult[];
  }, [data]);

  const warnings = React.useMemo(() => {
    if (data) {
      return data.validation_results.warnings.filter((warning) =>
        isInSection(["voters_counts", "votes_counts"], warning.fields),
      );
    }
    return [] as ValidationResult[];
  }, [data]);

  const setSectionValues = (values: VotersAndVotesValues) => {
    setValues((old) => ({
      ...old,
      voters_counts: {
        ...values.voters_counts,
      },
      votes_counts: {
        ...values.votes_counts,
      },
    }));
  };

  const isCalled = React.useMemo(() => {
    if (sectionValues.votes_counts.total_votes_cast_count > 0) {
      return true;
    }
    return false;
  }, [sectionValues]);

  return {
    loading,
    sectionValues,
    setSectionValues,
    errors,
    warnings,
    serverError: error,
    isCalled,
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
