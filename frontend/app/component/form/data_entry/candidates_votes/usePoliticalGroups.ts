import * as React from "react";

import { PoliticalGroupVotes } from "@kiesraad/api";

import { useDataEntryContext } from "../state/useDataEntryContext";

export function usePoliticalGroup(
  political_group_number: number,
  getValues: () => PoliticalGroupVotes,
  getAcceptWarnings?: () => boolean,
) {
  const { status, pollingStationResults, formState, cache, onSubmitForm } = useDataEntryContext({
    type: "political_group_votes",
    id: `political_group_votes_${political_group_number}`,
  });

  const sectionValues = React.useMemo(() => {
    if (cache && cache.key === `political_group_votes_${political_group_number}`) {
      const data = cache.data;
      return data as PoliticalGroupVotes;
    }
    return pollingStationResults.political_group_votes.find((pg) => pg.number === political_group_number);
  }, [pollingStationResults, political_group_number, cache]);

  const errors = formState.sections[`political_group_votes_${political_group_number}`]?.errors || [];
  const warnings = formState.sections[`political_group_votes_${political_group_number}`]?.warnings || [];

  return {
    status,
    sectionValues,
    errors,
    warnings,
    isSaved: formState.sections[`political_group_votes_${political_group_number}`]?.isSaved || false,
    submit: onSubmitForm,
    acceptWarnings: formState.sections[`political_group_votes_${political_group_number}`]?.acceptWarnings || false,
  };
}
