import * as React from "react";

import { PoliticalGroupVotes, usePollingStationFormController } from "@kiesraad/api";

export function usePoliticalGroup(
  political_group_number: number,
  getValues: () => PoliticalGroupVotes,
) {
  const {
    values,
    formState,
    loading,
    setTemporaryCache,
    cache,
    registerCurrentForm,
    submitCurrentForm,
  } = usePollingStationFormController();

  const sectionValues = React.useMemo(() => {
    if (cache && cache.key === `political_group_votes_${political_group_number}`) {
      const data = cache.data;
      setTemporaryCache(null);
      return data as PoliticalGroupVotes;
    }
    return values.political_group_votes.find((pg) => pg.number === political_group_number);
  }, [values, political_group_number, setTemporaryCache, cache]);

  const errors = React.useMemo(() => {
    return formState.sections[`political_group_votes_${political_group_number}`]?.errors || [];
  }, [formState, political_group_number]);

  const warnings = React.useMemo(() => {
    return formState.sections[`political_group_votes_${political_group_number}`]?.warnings || [];
  }, [formState, political_group_number]);

  //Once form is rendered, register the form
  React.useEffect(() => {
    registerCurrentForm({
      type: "political_group_votes",
      id: `political_group_votes_${political_group_number}`,
      number: political_group_number,
      getValues,
    });
  }, [registerCurrentForm, getValues, political_group_number]);

  return {
    sectionValues,
    errors,
    warnings,
    loading,
    isSaved:
      formState.sections[`political_group_votes_${political_group_number}`]?.isSaved || false,
    setTemporaryCache,
    submit: submitCurrentForm,
    isCompleted: formState.isCompleted,
    ignoreWarnings:
      formState.sections[`political_group_votes_${political_group_number}`]?.ignoreWarnings ||
      false,
  };
}
