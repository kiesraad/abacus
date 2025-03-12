import { PoliticalGroupVotes } from "@/types/generated/openapi";
import { deformatNumber, formatNumber } from "@/utils";

export interface CandidateVotesFormValues extends Omit<PoliticalGroupVotes, "total" | "candidate_votes"> {
  total: string;
  candidate_votes: string[];
}

export type CandidateVotesValues = PoliticalGroupVotes;

export function valuesToFormValues(values: PoliticalGroupVotes): CandidateVotesFormValues {
  return {
    number: values.number,
    total: formatNumber(values.total),
    candidate_votes: values.candidate_votes.map((cv) => formatNumber(cv.votes)),
  };
}

export function formValuesToValues(formData: CandidateVotesFormValues): PoliticalGroupVotes {
  return {
    number: formData.number,
    total: deformatNumber(formData.total),
    candidate_votes: formData.candidate_votes.map((votes, index) => ({
      number: index + 1,
      votes: deformatNumber(votes),
    })),
  };
}
