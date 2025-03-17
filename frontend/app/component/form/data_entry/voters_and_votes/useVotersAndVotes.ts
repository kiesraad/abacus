import { SubmitCurrentFormOptions } from "../state/types";
import { useDataEntryFormSection } from "../state/useDataEntryFormSection";
import {
  formValuesToValues,
  valuesToFormValues,
  VotersAndVotesFormValues,
  VotersAndVotesValues,
} from "./votersAndVotesValues";

export function useVotersAndVotes() {
  const { onSubmit: _onSubmit, ...section } = useDataEntryFormSection<VotersAndVotesFormValues>({
    section: {
      id: "voters_votes_counts",
      type: "voters_and_votes",
    },
    getDefaultFormValues: (results, cache) =>
      cache?.key === "voters_votes_counts"
        ? valuesToFormValues(cache.data as VotersAndVotesValues)
        : valuesToFormValues({
            voters_counts: results.voters_counts,
            votes_counts: results.votes_counts,
            voters_recounts: results.voters_recounts || undefined,
          }),
  });

  // submit and save to form contents
  const onSubmit = async (options?: SubmitCurrentFormOptions): Promise<boolean> => {
    const data: VotersAndVotesValues = formValuesToValues(
      section.currentValues,
      section.pollingStationResults.recounted || false,
    );

    return await _onSubmit(data, { ...options, showAcceptWarnings: section.showAcceptWarnings });
  };

  return {
    ...section,
    onSubmit,
  };
}
