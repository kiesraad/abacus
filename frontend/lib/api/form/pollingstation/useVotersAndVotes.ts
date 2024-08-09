import * as React from "react";

import {
  PollingStationResults,
  usePollingStationFormController,
  ValidationResult,
} from "@kiesraad/api";
import { matchValidationResultWithFormSections } from "@kiesraad/util";

export type VotersAndVotesValues = Pick<
  PollingStationResults,
  "voters_counts" | "votes_counts" | "voters_recounts"
>;

export function useVotersAndVotes() {
  const { values, setValues, loading, error, data, setTemporaryCache, cache } =
    usePollingStationFormController();

  const sectionValues = React.useMemo(() => {
    if (cache && cache.key === "voters_and_votes") {
      const data = cache.data as VotersAndVotesValues;
      setTemporaryCache(null);
      return data;
    }
    return {
      voters_counts: values.voters_counts,
      votes_counts: values.votes_counts,
      voters_recounts: values.voters_recounts,
    };
  }, [values, setTemporaryCache, cache]);

  const isCalled = React.useMemo(() => {
    return sectionValues.votes_counts.total_votes_cast_count > 0;
  }, [sectionValues]);

  const errors = React.useMemo(() => {
    if (data) {
      return data.validation_results.errors.filter((err) =>
        matchValidationResultWithFormSections(err.fields, [
          "voters_counts",
          "votes_counts",
          "voters_recounts",
        ]),
      );
    }
    return [] as ValidationResult[];
  }, [data]);

  const warnings = React.useMemo(() => {
    if (data) {
      return data.validation_results.warnings.filter((warning) =>
        matchValidationResultWithFormSections(warning.fields, [
          "voters_counts",
          "votes_counts",
          "voters_recounts",
        ]),
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
      voters_recounts: values.voters_recounts
        ? {
            ...values.voters_recounts,
          }
        : undefined,
    }));
  };

  return {
    loading,
    sectionValues,
    setSectionValues,
    errors,
    warnings,
    serverError: error,
    isCalled,
    setTemporaryCache,
    recounted: values.recounted,
  };
}
