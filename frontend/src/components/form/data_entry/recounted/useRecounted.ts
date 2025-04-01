import { PollingStationResults } from "@kiesraad/api";

import { SubmitCurrentFormOptions } from "../state/types";
import { useDataEntryFormSection } from "../state/useDataEntryFormSection";

export type RecountedValue = Pick<PollingStationResults, "recounted">;

export function useRecounted() {
  const { onSubmit: _onSubmit, ...section } = useDataEntryFormSection<boolean | undefined>({
    section: "recounted",
    getDefaultFormValues: (results) => results.recounted,
  });

  // submit and save to form contents
  const onSubmit = async (options?: SubmitCurrentFormOptions): Promise<boolean> => {
    const data: Partial<PollingStationResults> = { recounted: section.currentValues };

    if (!section.pollingStationResults.voters_recounts && section.currentValues) {
      data.voters_recounts = {
        poll_card_count: 0,
        proxy_certificate_count: 0,
        voter_card_count: 0,
        total_admitted_voters_count: 0,
      };
    }

    return _onSubmit(data, options);
  };

  return {
    ...section,
    recounted: section.currentValues,
    setRecounted: section.setValues,
    onSubmit,
  };
}
