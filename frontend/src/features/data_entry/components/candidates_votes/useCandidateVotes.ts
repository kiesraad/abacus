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
    getDefaultFormValues: (results, cache) => {
      let values;
      if (cache?.key === `political_group_votes_${political_group_number}`) {
        values = cache.data["political_group_votes"]?.find((pg) => pg.number === political_group_number);
      }
      values ??= results.political_group_votes.find((pg) => pg.number === political_group_number);
      values ??= {
        number: political_group_number,
        total: 0,
        candidate_votes: [],
      };
      return valuesToFormValues(values);
    },
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
      { ...options, showAcceptErrorsAndWarnings: section.showAcceptErrorsAndWarnings },
    );
  };

  return {
    ...section,
    onSubmit,
    missingTotalError,
  };
}
