import { PollingStationResults } from "@/api/gen/openapi";
import { deformatNumber, formatNumber } from "@/lib/util/format";

export type DifferencesValues = PollingStationResults["differences_counts"];

export type DifferencesFormValues = {
  fewer_ballots_count: string;
  more_ballots_count: string;
  no_explanation_count: string;
  other_explanation_count: string;
  too_few_ballots_handed_out_count: string;
  too_many_ballots_handed_out_count: string;
  unreturned_ballots_count: string;
};

export function valuesToFormValues(values: DifferencesValues): DifferencesFormValues {
  return {
    fewer_ballots_count: formatNumber(values.fewer_ballots_count),
    more_ballots_count: formatNumber(values.more_ballots_count),
    no_explanation_count: formatNumber(values.no_explanation_count),
    other_explanation_count: formatNumber(values.other_explanation_count),
    too_few_ballots_handed_out_count: formatNumber(values.too_few_ballots_handed_out_count),
    too_many_ballots_handed_out_count: formatNumber(values.too_many_ballots_handed_out_count),
    unreturned_ballots_count: formatNumber(values.unreturned_ballots_count),
  };
}

export function formValuesToValues(formData: DifferencesFormValues): DifferencesValues {
  return {
    fewer_ballots_count: deformatNumber(formData.fewer_ballots_count),
    more_ballots_count: deformatNumber(formData.more_ballots_count),
    no_explanation_count: deformatNumber(formData.no_explanation_count),
    other_explanation_count: deformatNumber(formData.other_explanation_count),
    too_few_ballots_handed_out_count: deformatNumber(formData.too_few_ballots_handed_out_count),
    too_many_ballots_handed_out_count: deformatNumber(formData.too_many_ballots_handed_out_count),
    unreturned_ballots_count: deformatNumber(formData.unreturned_ballots_count),
  };
}
