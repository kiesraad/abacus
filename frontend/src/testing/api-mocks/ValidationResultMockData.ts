import { ValidationResult, ValidationResultCode } from "@/types/generated/openapi";

type ErrorWarningsMap<Code extends ValidationResultCode> = {
  [C in Code]: ValidationResult & { code: C };
};

export const validationResultMockData: ErrorWarningsMap<ValidationResultCode> = {
  F201: {
    fields: [
      "data.voters_counts.poll_card_count",
      "data.voters_counts.proxy_certificate_count",
      "data.voters_counts.total_admitted_voters_count",
    ],
    code: "F201",
  },
  F202: {
    fields: [
      "data.votes_counts.total_votes_cast_count",
      "data.votes_counts.votes_candidates_count",
      "data.votes_counts.blank_votes_count",
      "data.votes_counts.invalid_votes_count",
    ],
    code: "F202",
  },
  F204: {
    fields: ["data.votes_counts.votes_candidates_count", "data.political_group_votes[0].total"],
    code: "F204",
  },
  F301: { fields: ["data.differences_counts.more_ballots_count"], code: "F301" },
  F302: { fields: ["data.differences_counts.fewer_ballots_count"], code: "F302" },
  F303: { fields: ["data.differences_counts.fewer_ballots_count"], code: "F303" },
  F304: { fields: ["data.differences_counts.more_ballots_count"], code: "F304" },
  F305: {
    fields: [
      "data.differences_counts.fewer_ballots_count",
      "data.differences_counts.unreturned_ballots_count",
      "data.differences_counts.too_many_ballots_handed_out_count",
      "data.differences_counts.too_few_ballots_handed_out_count",
      "data.differences_counts.other_explanation_count",
      "data.differences_counts.no_explanation_count",
    ],
    code: "F305",
  },
  F401: { fields: ["data.political_group_votes[0]"], code: "F401" },
  F402: { fields: ["data.political_group_votes[0].total"], code: "F402" },
  W001: { fields: ["data.voters_counts.poll_card_count"], code: "W001" },
  W201: { fields: ["data.votes_counts.blank_votes_count"], code: "W201" },
  W202: { fields: ["data.votes_counts.invalid_votes_count"], code: "W202" },
  W203: {
    fields: ["data.votes_counts.total_votes_cast_count", "data.voters_counts.total_admitted_voters_count"],
    code: "W203",
  },
  W205: { fields: ["data.votes_counts.total_votes_cast_count"], code: "W205" },
  W301: {
    fields: [
      "data.differences_counts.more_ballots_count",
      "data.differences_counts.too_many_ballots_handed_out_count",
      "data.differences_counts.unreturned_ballots_count",
      "data.differences_counts.too_few_ballots_handed_out_count",
      "data.differences_counts.other_explanation_count",
      "data.differences_counts.no_explanation_count",
    ],
    code: "W301",
  },
  W302: {
    fields: [
      "data.differences_counts.fewer_ballots_count",
      "data.differences_counts.unreturned_ballots_count",
      "data.differences_counts.too_few_ballots_handed_out_count",
      "data.differences_counts.too_many_ballots_handed_out_count",
      "data.differences_counts.other_explanation_count",
      "data.differences_counts.no_explanation_count",
    ],
    code: "W302",
  },
};
