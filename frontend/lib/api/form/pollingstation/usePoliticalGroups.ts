import * as React from "react";

import { PoliticalGroupVotes, usePollingStationFormController } from "@kiesraad/api";

export function usePoliticalGroup(
  political_group_number: number,
  getValues: () => PoliticalGroupVotes,
  getAcceptWarnings?: () => boolean,
) {
  const { status, values, formState, setTemporaryCache, cache, registerCurrentForm, submitCurrentForm } =
    usePollingStationFormController();

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
      getAcceptWarnings: getAcceptWarnings,
    });
  }, [registerCurrentForm, getValues, political_group_number, getAcceptWarnings]);

  return {
    status,
    sectionValues,
    errors,
    warnings,
    isSaved: formState.sections[`political_group_votes_${political_group_number}`]?.isSaved || false,
    setTemporaryCache,
    submit: submitCurrentForm,
    acceptWarnings: formState.sections[`political_group_votes_${political_group_number}`]?.acceptWarnings || false,
  };
}
