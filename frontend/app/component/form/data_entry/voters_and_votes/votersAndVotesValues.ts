import { PollingStationResults } from "@kiesraad/api";
import { deformatNumber, formatNumber } from "@kiesraad/util";

export type VotersAndVotesValues = Pick<PollingStationResults, "voters_counts" | "votes_counts" | "voters_recounts">;

export interface VotersAndVotesFormValues {
  poll_card_count: string;
  proxy_certificate_count: string;
  voter_card_count: string;
  total_admitted_voters_count: string;
  votes_candidates_count: string;
  blank_votes_count: string;
  invalid_votes_count: string;
  total_votes_cast_count: string;
  poll_card_recount: string;
  proxy_certificate_recount: string;
  voter_card_recount: string;
  total_admitted_voters_recount: string;
}

export function valuesToFormValues(values: VotersAndVotesValues): VotersAndVotesFormValues {
  return {
    poll_card_count: formatNumber(values.voters_counts.poll_card_count),
    proxy_certificate_count: formatNumber(values.voters_counts.proxy_certificate_count),
    voter_card_count: formatNumber(values.voters_counts.voter_card_count),
    total_admitted_voters_count: formatNumber(values.voters_counts.total_admitted_voters_count),
    votes_candidates_count: formatNumber(values.votes_counts.votes_candidates_count),
    blank_votes_count: formatNumber(values.votes_counts.blank_votes_count),
    invalid_votes_count: formatNumber(values.votes_counts.invalid_votes_count),
    total_votes_cast_count: formatNumber(values.votes_counts.total_votes_cast_count),
    poll_card_recount: formatNumber(values.voters_recounts?.poll_card_count),
    proxy_certificate_recount: formatNumber(values.voters_recounts?.proxy_certificate_count),
    voter_card_recount: formatNumber(values.voters_recounts?.voter_card_count),
    total_admitted_voters_recount: formatNumber(values.voters_recounts?.total_admitted_voters_count),
  };
}

export function formValuesToValues(formData: VotersAndVotesFormValues): VotersAndVotesValues {
  return {
    voters_counts: {
      poll_card_count: deformatNumber(formData.poll_card_count),
      proxy_certificate_count: deformatNumber(formData.proxy_certificate_count),
      voter_card_count: deformatNumber(formData.voter_card_count),
      total_admitted_voters_count: deformatNumber(formData.total_admitted_voters_count),
    },
    votes_counts: {
      votes_candidates_count: deformatNumber(formData.votes_candidates_count),
      blank_votes_count: deformatNumber(formData.blank_votes_count),
      invalid_votes_count: deformatNumber(formData.invalid_votes_count),
      total_votes_cast_count: deformatNumber(formData.total_votes_cast_count),
    },
    voters_recounts: formData.poll_card_recount
      ? {
          poll_card_count: deformatNumber(formData.poll_card_recount),
          proxy_certificate_count: deformatNumber(formData.proxy_certificate_recount),
          voter_card_count: deformatNumber(formData.voter_card_recount),
          total_admitted_voters_count: deformatNumber(formData.total_admitted_voters_recount),
        }
      : undefined,
  };
}
