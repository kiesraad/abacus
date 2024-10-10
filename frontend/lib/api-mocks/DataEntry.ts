import { PollingStationResults, ValidationResults } from "@kiesraad/api";

export function validate(data: PollingStationResults): ValidationResults {
  const validation_results: ValidationResults = {
    errors: [],
    warnings: [],
  };

  const { recounted, voters_counts, votes_counts, voters_recounts, differences_counts, political_group_votes } = data;

  // Rules and checks implemented in this mock api:
  // F.101, F.201-204, F.301-305, F.401, W.301-302
  // Rules and checks not implemented in this mock api:
  // W.201-210

  // SECTION recounted
  //  F.101
  if (recounted === undefined) {
    validation_results.errors.push({
      fields: ["data.recounted"],
      code: "F101",
    });
  }

  const total_votes_counts = votes_counts.total_votes_cast_count;
  let total_voters_counts;

  //SECTION votes_counts
  // F.202 E + F + G = H
  if (
    votes_counts.votes_candidates_count + votes_counts.blank_votes_count + votes_counts.invalid_votes_count !==
    votes_counts.total_votes_cast_count
  ) {
    validation_results.errors.push({
      fields: [
        "data.votes_counts.total_votes_cast_count",
        "data.votes_counts.votes_candidates_count",
        "data.votes_counts.blank_votes_count",
        "data.votes_counts.invalid_votes_count",
      ],
      code: "F202",
    });
  }

  if (voters_recounts) {
    // if recounted = true
    //SECTION voters_recounts
    total_voters_counts = voters_recounts.total_admitted_voters_recount;

    // F.203 A.2 + B.2 + C.2 = D.2
    if (
      voters_recounts.poll_card_recount +
        voters_recounts.proxy_certificate_recount +
        voters_recounts.voter_card_recount !==
      voters_recounts.total_admitted_voters_recount
    ) {
      validation_results.errors.push({
        fields: [
          "data.voters_recounts.poll_card_recount",
          "data.voters_recounts.proxy_certificate_recount",
          "data.voters_recounts.voter_card_recount",
          "data.voters_recounts.total_admitted_voters_recount",
        ],
        code: "F203",
      });
    }
  } else {
    // if recounted = false
    //SECTION voters_counts
    total_voters_counts = voters_counts.total_admitted_voters_count;

    // F.201 A + B + C = D
    if (
      voters_counts.poll_card_count + voters_counts.proxy_certificate_count + voters_counts.voter_card_count !==
      voters_counts.total_admitted_voters_count
    ) {
      validation_results.errors.push({
        fields: [
          "data.voters_counts.poll_card_count",
          "data.voters_counts.proxy_certificate_count",
          "data.voters_counts.voter_card_count",
          "data.voters_counts.total_admitted_voters_count",
        ],
        code: "F201",
      });
    }
  }

  //SECTION differences_counts
  if (total_voters_counts < total_votes_counts) {
    // F.301 validate that the difference for more ballots counted is correct
    if (total_votes_counts - total_voters_counts != differences_counts.more_ballots_count) {
      validation_results.errors.push({
        fields: ["data.differences_counts.more_ballots_count"],
        code: "F301",
      });
    }
    // F.302 validate that fewer ballots counted is empty
    if (differences_counts.fewer_ballots_count !== 0) {
      validation_results.errors.push({
        fields: ["data.differences_counts.fewer_ballots_count"],
        code: "F302",
      });
    }
  }

  if (total_voters_counts > total_votes_counts) {
    // F.303 validate that the difference for fewer ballots counted is correct
    if (total_voters_counts - total_votes_counts != differences_counts.fewer_ballots_count) {
      validation_results.errors.push({
        fields: ["data.differences_counts.fewer_ballots_count"],
        code: "F303",
      });
    }
    // F.304 validate that more ballots counted is empty
    if (differences_counts.more_ballots_count !== 0) {
      validation_results.errors.push({
        fields: ["data.differences_counts.more_ballots_count"],
        code: "F304",
      });
    }
  }

  // F.305 validate that no differences should be filled in when there is no difference in the totals
  if (total_voters_counts == total_votes_counts) {
    const fields: string[] = [];
    if (differences_counts.more_ballots_count != 0) {
      fields.push("data.differences_counts.more_ballots_count");
    }
    if (differences_counts.fewer_ballots_count != 0) {
      fields.push("data.differences_counts.fewer_ballots_count");
    }
    if (differences_counts.unreturned_ballots_count != 0) {
      fields.push("data.differences_counts.unreturned_ballots_count");
    }
    if (differences_counts.too_few_ballots_handed_out_count != 0) {
      fields.push("data.differences_counts.too_few_ballots_handed_out_count");
    }
    if (differences_counts.too_many_ballots_handed_out_count != 0) {
      fields.push("data.differences_counts.too_many_ballots_handed_out_count");
    }
    if (differences_counts.other_explanation_count != 0) {
      fields.push("data.differences_counts.other_explanation_count");
    }
    if (differences_counts.no_explanation_count != 0) {
      fields.push("data.differences_counts.no_explanation_count");
    }
    if (fields.length > 0) {
      validation_results.errors.push({
        fields: fields,
        code: "F305",
      });
    }
  }

  // W.301 if I: M + N + O - K - L = I
  if (
    differences_counts.more_ballots_count !== 0 &&
    differences_counts.too_many_ballots_handed_out_count +
      differences_counts.other_explanation_count +
      differences_counts.no_explanation_count -
      differences_counts.unreturned_ballots_count -
      differences_counts.too_few_ballots_handed_out_count !==
      differences_counts.more_ballots_count
  ) {
    validation_results.warnings.push({
      fields: [
        "data.differences_counts.more_ballots_count",
        "data.differences_counts.too_many_ballots_handed_out_count",
        "data.differences_counts.unreturned_ballots_count",
        "data.differences_counts.too_few_ballots_handed_out_count",
        "data.differences_counts.other_explanation_count",
        "data.differences_counts.no_explanation_count",
      ],
      code: "W301",
    });
  }

  // W.302 if J: K + L + N + O - M = J
  if (
    differences_counts.fewer_ballots_count !== 0 &&
    differences_counts.unreturned_ballots_count +
      differences_counts.too_few_ballots_handed_out_count +
      differences_counts.other_explanation_count +
      differences_counts.no_explanation_count -
      differences_counts.too_many_ballots_handed_out_count !==
      differences_counts.fewer_ballots_count
  ) {
    validation_results.warnings.push({
      fields: [
        "data.differences_counts.fewer_ballots_count",
        "data.differences_counts.unreturned_ballots_count",
        "data.differences_counts.too_few_ballots_handed_out_count",
        "data.differences_counts.too_many_ballots_handed_out_count",
        "data.differences_counts.other_explanation_count",
        "data.differences_counts.no_explanation_count",
      ],
      code: "W302",
    });
  }

  //SECTION political_group_votes
  let candidateVotesSum = 0;
  political_group_votes.forEach((pg) => {
    // F.401
    const sum = pg.candidate_votes.reduce((acc, cv) => acc + cv.votes, 0);
    candidateVotesSum += sum;
    if (sum !== pg.total) {
      validation_results.errors.push({
        fields: [`data.political_group_votes[${pg.number - 1}]`],
        code: "F401",
      });
    }
  });

  // F.204
  if (votes_counts.votes_candidates_count !== candidateVotesSum) {
    validation_results.errors.push({
      fields: ["data.votes_counts.votes_candidates_count", "data.political_group_votes"],
      code: "F204",
    });
  }

  return validation_results;
}
