import * as React from "react";

import { SubmitCurrentFormOptions } from "../state/types";
import { useDataEntryFormSection } from "../state/useDataEntryFormSection";
import {
  CandidateVotesFormValues,
  CandidateVotesValues,
  formValuesToValues,
  valuesToFormValues,
} from "./candidatesVotesValues";

export function useCandidateVotes(political_group_number: number) {
  const { onSubmit: _onSubmit, ...section } = useDataEntryFormSection<CandidateVotesFormValues>({
    section: {
      id: `political_group_votes_${political_group_number}`,
      type: "political_group_votes",
      number: political_group_number,
    },
    getDefaultFormValues: (results) =>
      valuesToFormValues(
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
