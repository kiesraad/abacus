import { useDataEntryFormSection } from "../../stores/useDataEntryFormSection";
import { SubmitCurrentFormOptions } from "../../types/types";
import { DifferencesFormValues, DifferencesValues, formValuesToValues, valuesToFormValues } from "./differencesValues";

export function useDifferences() {
  const { onSubmit: _onSubmit, ...section } = useDataEntryFormSection<DifferencesFormValues>({
    section: "differences_counts",
    getDefaultFormValues: (results, cache) =>
      cache?.key === "differences_counts"
        ? valuesToFormValues(cache.data as DifferencesValues)
        : valuesToFormValues(results.differences_counts),
  });

  // submit and save to form contents
  const onSubmit = async (options?: SubmitCurrentFormOptions): Promise<boolean> => {
    const data: DifferencesValues = formValuesToValues(section.currentValues);

    return await _onSubmit(
      {
        differences_counts: data,
      },
      { ...options, showAcceptWarnings: section.showAcceptWarnings },
    );
  };

  return {
    ...section,
    onSubmit,
  };
}
