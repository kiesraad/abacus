import { GetDataEntryResponse, PollingStation } from "@kiesraad/api";

// should match backend/fixtures/polling_stations.sql

export const pollingStation33: PollingStation = {
  id: 1,
  election_id: 1,
  name: "Op Rolletjes",
  number: 33,
  number_of_voters: undefined,
  polling_station_type: "Mobile",
  street: "Rijksweg A12",
  house_number: "1",
  house_number_addition: undefined,
  postal_code: "1234 YQ",
  locality: "Den Haag",
};

export const emptyDataEntryResponse: GetDataEntryResponse = {
  data: {
    recounted: false,
    voters_counts: {
      poll_card_count: 0,
      proxy_certificate_count: 0,
      voter_card_count: 0,
      total_admitted_voters_count: 0,
    },
    votes_counts: {
      votes_candidates_count: 0,
      blank_votes_count: 0,
      invalid_votes_count: 0,
      total_votes_cast_count: 0,
    },
    differences_counts: {
      more_ballots_count: 0,
      fewer_ballots_count: 0,
      unreturned_ballots_count: 0,
      too_few_ballots_handed_out_count: 0,
      too_many_ballots_handed_out_count: 0,
      other_explanation_count: 0,
      no_explanation_count: 0,
    },
    political_group_votes: [
      {
        number: 1,
        total: 0,
        candidate_votes: [
          {
            number: 1,
            votes: 0,
          },
          {
            number: 2,
            votes: 0,
          },
        ],
      },
    ],
  },
  validation_results: {
    errors: [],
    warnings: [],
  },
  client_state: {},
  timestamp: Number(Date.now() / 1000),
};
