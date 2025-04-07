import * as React from "react";

import { useDataEntryFormSection } from "../../hooks/useDataEntryFormSection";
import { SubmitCurrentFormOptions } from "../../types/types";
import {
  CandidateVotesFormValues,
  CandidateVotesValues,
  formValuesToValues,
  valuesToFormValues,
} from "./candidatesVotesValues";

export function useCandidateVotes(political_group_number: number) {
  const { onSubmit: _onSubmit, ...section } = useDataEntryFormSection<CandidateVotesFormValues>({
    section: `political_group_votes_${political_group_number}`,
    getDefaultFormValues: (results, cache) =>
      cache?.key === `political_group_votes_${political_group_number}`
        ? valuesToFormValues(cache.data as CandidateVotesValues)
        : valuesToFormValues(
            results.political_group_votes.find((pg) => pg.number === political_group_number) as CandidateVotesValues,
          ),
  });

  const [missingTotalError, setMissingTotalError] = React.useState(false);

  // submit and save to form contents
  const onSubmit = async (options?: SubmitCurrentFormOptions): Promise<boolean> => {
    const data: CandidateVotesValues = formValuesToValues(section.currentValues);
    const isMissingTotal = section.currentValues.candidate_votes.some((v) => v !== "") && !section.currentValues.total;
    setMissingTotalError(isMissingTotal);
    if (isMissingTotal) {
      return false;
    }
    return await _onSubmit(
      {
        political_group_votes: section.pollingStationResults.political_group_votes.map((pg) =>
          pg.number === political_group_number ? data : pg,
        ),
      },
      { ...options, showAcceptWarnings: section.showAcceptWarnings },
    );
  };

  return {
    ...section,
    onSubmit,
    missingTotalError,
  };
}
