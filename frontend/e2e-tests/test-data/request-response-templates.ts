import {
  ClaimDataEntryResponse,
  DataEntry,
  NewElection,
  PollingStationRequest,
  PollingStationResults,
  SaveDataEntryResponse,
} from "@/types/generated/openapi";

export const electionRequest: NewElection = {
  name: "Test Election",
  election_id: "TestLocation_2026",
  location: "Test Location",
  domain_id: "0000",
  number_of_voters: 100,
  category: "Municipal",
  number_of_seats: 29,
  election_date: "2026-01-01",
  nomination_date: "2026-01-01",
  status: "DataEntryInProgress",
  political_groups: [
    {
      number: 1,
      name: "Political Group A",
      candidates: [
        {
          number: 1,
          initials: "A.",
          first_name: "Alice",
          last_name: "Foo",
          locality: "Amsterdam",
          gender: "Female",
        },
        {
          number: 2,
          initials: "C.",
          first_name: "Charlie",
          last_name: "Doe",
          locality: "Rotterdam",
        },
      ],
    },
  ],
};

export const pollingStationRequests: PollingStationRequest[] = [
  {
    name: "Op Rolletjes",
    number: 33,
    polling_station_type: "Mobile",
    address: "Rijksweg A12 1",
    postal_code: "1234 YQ",
    locality: "Den Haag",
  },
  {
    name: "Testplek",
    number: 34,
    number_of_voters: 1000,
    polling_station_type: "Special",
    address: "Teststraat 2b",
    postal_code: "1234 QY",
    locality: "Testdorp",
  },
];

export const emptyDataEntryResponse: Partial<ClaimDataEntryResponse> = {
  data: {
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
  client_state: null,
};

export const noRecountNoDifferencesDataEntry: PollingStationResults = {
  recounted: false,
  voters_counts: {
    poll_card_count: 800,
    proxy_certificate_count: 50,
    voter_card_count: 75,
    total_admitted_voters_count: 925,
  },
  votes_counts: {
    votes_candidates_count: 890,
    blank_votes_count: 20,
    invalid_votes_count: 15,
    total_votes_cast_count: 925,
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
      total: 890,
      candidate_votes: [
        {
          number: 1,
          votes: 737,
        },
        {
          number: 2,
          votes: 153,
        },
      ],
    },
  ],
};

export const noRecountNoDifferencesRequest: DataEntry = {
  progress: 80,
  data: noRecountNoDifferencesDataEntry,
  client_state: {
    furthest: "political_group_votes_1",
    current: "political_group_votes_1",
    acceptedErrorsAndWarnings: [],
    continue: true,
  },
};

export const emptyRequest: DataEntry = {
  progress: 80,
  data: emptyDataEntryResponse.data!,
  client_state: {
    furthest: "political_group_votes_1",
    current: "political_group_votes_1",
    acceptedErrorsAndWarnings: [],
    continue: true,
  },
};

export const noErrorsWarningsResponse: SaveDataEntryResponse = {
  validation_results: {
    errors: [],
    warnings: [],
  },
};
