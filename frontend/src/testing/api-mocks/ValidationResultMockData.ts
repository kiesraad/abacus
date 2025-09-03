import { ValidationResult, ValidationResultCode } from "@/types/generated/openapi";

type ErrorWarningsMap<Code extends ValidationResultCode> = {
  [C in Code]: ValidationResult & { code: C };
};

export const validationResultMockData: ErrorWarningsMap<ValidationResultCode> = {
  F101: {
    fields: ["data.extra_investigation"],
    code: "F101",
  },
  F102: {
    fields: ["data.extra_investigation"],
    code: "F102",
  },
  F111: {
    fields: ["data.counting_differences_polling_station"],
    code: "F111",
  },
  F112: {
    fields: ["data.counting_differences_polling_station"],
    code: "F112",
  },
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
      "data.votes_counts.political_group_total_votes[0].total",
      "data.votes_counts.total_votes_candidates_count",
    ],
    code: "F202",
  },
  F203: {
    fields: [
      "data.votes_counts.total_votes_cast_count",
      "data.votes_counts.blank_votes_count",
      "data.votes_counts.invalid_votes_count",
      "data.votes_counts.total_votes_candidates_count",
    ],
    code: "F203",
  },
  F301: { fields: ["data.differences_counts.more_ballots_count"], code: "F301" },
  F302: { fields: ["data.differences_counts.fewer_ballots_count"], code: "F302" },
  F303: { fields: ["data.differences_counts.fewer_ballots_count"], code: "F303" },
  F304: { fields: ["data.differences_counts.more_ballots_count"], code: "F304" },
  F305: {
    fields: ["data.differences_counts.fewer_ballots_count"],
    code: "F305",
  },
  F401: {
    fields: ["data.political_group_votes[0].total"],
    context: { political_group_number: "1" },
    code: "F401",
  },
  F402: {
    fields: ["data.political_group_votes[0]"],
    context: { political_group_number: "1" },
    code: "F402",
  },
  F403: {
    fields: ["data.political_group_votes[0].total", "data.votes_counts.political_group_total_votes[0].total"],
    context: { political_group_number: "1" },
    code: "F403",
  },
  W001: { fields: ["data.voters_counts.poll_card_count"], code: "W001" },
  W201: { fields: ["data.votes_counts.blank_votes_count"], code: "W201" },
  W202: { fields: ["data.votes_counts.invalid_votes_count"], code: "W202" },
  W203: {
    fields: ["data.votes_counts.total_votes_cast_count", "data.voters_counts.total_admitted_voters_count"],
    code: "W203",
  },
  W204: { fields: ["data.votes_counts.total_votes_cast_count"], code: "W204" },
};
