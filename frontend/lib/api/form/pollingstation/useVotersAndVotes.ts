import * as React from "react";

import { PollingStationResults, usePollingStationFormController } from "@kiesraad/api";

export type VotersAndVotesValues = Pick<
  PollingStationResults,
  "voters_counts" | "votes_counts" | "voters_recounts"
>;

export function useVotersAndVotes(getValues: () => VotersAndVotesValues) {
  const {
    values,
    loading,
    formState,
    setTemporaryCache,
    cache,
    registerCurrentForm,
    submitCurrentForm,
  } = usePollingStationFormController();

  const sectionValues = React.useMemo(() => {
    if (cache && cache.key === "voters_votes_counts") {
      const data = cache.data as VotersAndVotesValues;
      setTemporaryCache(null);
      return data;
    }

    const result: VotersAndVotesValues = {
      voters_counts: values.voters_counts,
      votes_counts: values.votes_counts,
      voters_recounts: undefined,
    };

    if (values.voters_recounts) {
      result.voters_recounts = values.voters_recounts;
    }

    return result;
  }, [values, setTemporaryCache, cache]);

  React.useEffect(() => {
    registerCurrentForm({
      id: "voters_votes_counts",
      type: "voters_and_votes",
      getValues,
    });
  }, [registerCurrentForm, getValues]);

  const errors = React.useMemo(() => {
    return formState.sections.voters_votes_counts.errors;
  }, [formState]);

  const warnings = React.useMemo(() => {
    return formState.sections.voters_votes_counts.warnings;
  }, [formState]);

  return {
    loading,
    sectionValues,
    errors,
    warnings,
    isSaved: formState.sections.voters_votes_counts.isSaved,
    ignoreWarnings: formState.sections.voters_votes_counts.ignoreWarnings,
    submit: submitCurrentForm,
    recounted: values.recounted,
    isCompleted: formState.isCompleted,
  };
}
