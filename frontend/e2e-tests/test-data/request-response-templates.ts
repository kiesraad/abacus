import type {
  CSOFirstSessionResults,
  DataEntry,
  PollingStationRequest,
  PollingStationResults,
  SaveDataEntryResponse,
} from "@/types/generated/openapi";

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

export function emptyCSOFirstSessionResults(): CSOFirstSessionResults {
  return {
    extra_investigation: {
      extra_investigation_other_reason: { yes: false, no: false },
      ballots_recounted_extra_investigation: { yes: false, no: false },
    },
    counting_differences_polling_station: {
      unexplained_difference_ballots_voters: { yes: false, no: false },
      difference_ballots_per_list: { yes: false, no: false },
    },
    voters_counts: {
      poll_card_count: 0,
      proxy_certificate_count: 0,
      total_admitted_voters_count: 0,
    },
    votes_counts: {
      political_group_total_votes: [
        { number: 1, total: 0 },
        { number: 2, total: 0 },
        { number: 3, total: 0 },
      ],
      total_votes_candidates_count: 0,
      blank_votes_count: 0,
      invalid_votes_count: 0,
      total_votes_cast_count: 0,
    },
    differences_counts: {
      more_ballots_count: 0,
      fewer_ballots_count: 0,
      compare_votes_cast_admitted_voters: {
        admitted_voters_equal_votes_cast: false,
        votes_cast_greater_than_admitted_voters: false,
        votes_cast_smaller_than_admitted_voters: false,
      },
      difference_completely_accounted_for: { yes: false, no: false },
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
          {
            number: 3,
            votes: 0,
          },
          {
            number: 4,
            votes: 0,
          },
          {
            number: 5,
            votes: 0,
          },
          {
            number: 6,
            votes: 0,
          },
          {
            number: 7,
            votes: 0,
          },
          {
            number: 8,
            votes: 0,
          },
          {
            number: 9,
            votes: 0,
          },
          {
            number: 10,
            votes: 0,
          },
          {
            number: 11,
            votes: 0,
          },
          {
            number: 12,
            votes: 0,
          },
        ],
      },
      {
        number: 2,
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
          {
            number: 3,
            votes: 0,
          },
          {
            number: 4,
            votes: 0,
          },
        ],
      },
      {
        number: 3,
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
  };
}

export const noRecountNoDifferencesDataEntry: PollingStationResults = {
  model: "CSOFirstSession",
  extra_investigation: {
    extra_investigation_other_reason: { yes: false, no: true },
    ballots_recounted_extra_investigation: { yes: false, no: true },
  },
  counting_differences_polling_station: {
    unexplained_difference_ballots_voters: { yes: false, no: true },
    difference_ballots_per_list: { yes: false, no: true },
  },
  voters_counts: {
    poll_card_count: 3450,
    proxy_certificate_count: 157,
    total_admitted_voters_count: 3607,
  },
  votes_counts: {
    political_group_total_votes: [
      { number: 1, total: 3536 },
      { number: 2, total: 36 },
      { number: 3, total: 0 },
    ],
    total_votes_candidates_count: 3572,
    blank_votes_count: 20,
    invalid_votes_count: 15,
    total_votes_cast_count: 3607,
  },
  differences_counts: {
    more_ballots_count: 0,
    fewer_ballots_count: 0,
    compare_votes_cast_admitted_voters: {
      admitted_voters_equal_votes_cast: true,
      votes_cast_greater_than_admitted_voters: false,
      votes_cast_smaller_than_admitted_voters: false,
    },
    difference_completely_accounted_for: { yes: true, no: false },
  },
  political_group_votes: [
    {
      number: 1,
      total: 3536,
      candidate_votes: [
        {
          number: 1,
          votes: 1337,
        },
        {
          number: 2,
          votes: 423,
        },
        {
          number: 3,
          votes: 300,
        },
        {
          number: 4,
          votes: 236,
        },
        {
          number: 5,
          votes: 533,
        },
        {
          number: 6,
          votes: 205,
        },
        {
          number: 7,
          votes: 103,
        },
        {
          number: 8,
          votes: 286,
        },
        {
          number: 9,
          votes: 0,
        },
        {
          number: 10,
          votes: 0,
        },
        {
          number: 11,
          votes: 113,
        },
        {
          number: 12,
          votes: 0,
        },
      ],
    },
    {
      number: 2,
      total: 36,
      candidate_votes: [
        {
          number: 1,
          votes: 28,
        },
        {
          number: 2,
          votes: 4,
        },
        {
          number: 3,
          votes: 2,
        },
        {
          number: 4,
          votes: 2,
        },
      ],
    },
    {
      number: 3,
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
};

export const dataEntryRequest: DataEntry = {
  progress: 88,
  data: noRecountNoDifferencesDataEntry,
  client_state: {
    furthest: "political_group_votes_3",
    current: "political_group_votes_3",
    acceptedErrorsAndWarnings: [],
    continue: true,
  },
};

export const dataEntryWithErrorRequest: DataEntry = {
  progress: 86,
  data: {
    ...noRecountNoDifferencesDataEntry,
    voters_counts: {
      poll_card_count: 10875,
      proxy_certificate_count: 50,
      total_admitted_voters_count: 925,
    },
  },
  client_state: {
    furthest: "political_group_votes_2",
    current: "political_group_votes_2",
    acceptedErrorsAndWarnings: ["voters_votes_counts", "differences_counts"],
    continue: true,
  },
};

export const dataEntryWithDifferencesRequest: DataEntry = {
  progress: 86,
  data: {
    ...noRecountNoDifferencesDataEntry,
    voters_counts: {
      ...noRecountNoDifferencesDataEntry.voters_counts,
      poll_card_count: noRecountNoDifferencesDataEntry.voters_counts.poll_card_count - 20,
      proxy_certificate_count: noRecountNoDifferencesDataEntry.voters_counts.proxy_certificate_count + 20,
    },
  },
  client_state: {
    furthest: "political_group_votes_2",
    current: "political_group_votes_2",
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

export const noRecountNoDifferencesDataEntryWithGaps: PollingStationResults = {
  model: "CSOFirstSession",
  extra_investigation: {
    extra_investigation_other_reason: { yes: false, no: true },
    ballots_recounted_extra_investigation: { yes: false, no: true },
  },
  counting_differences_polling_station: {
    unexplained_difference_ballots_voters: { yes: false, no: true },
    difference_ballots_per_list: { yes: false, no: true },
  },
  voters_counts: {
    poll_card_count: 2058,
    proxy_certificate_count: 150,
    total_admitted_voters_count: 2208,
  },
  votes_counts: {
    political_group_total_votes: [
      { number: 1, total: 2173 },
      { number: 3, total: 0 },
    ],
    total_votes_candidates_count: 2173,
    blank_votes_count: 20,
    invalid_votes_count: 15,
    total_votes_cast_count: 2208,
  },
  differences_counts: {
    more_ballots_count: 0,
    fewer_ballots_count: 0,
    compare_votes_cast_admitted_voters: {
      admitted_voters_equal_votes_cast: true,
      votes_cast_greater_than_admitted_voters: false,
      votes_cast_smaller_than_admitted_voters: false,
    },
    difference_completely_accounted_for: { yes: true, no: false },
  },
  political_group_votes: [
    {
      number: 1,
      total: 2173,
      candidate_votes: [
        {
          number: 2,
          votes: 1337,
        },
        {
          number: 3,
          votes: 423,
        },
        {
          number: 6,
          votes: 300,
        },
        {
          number: 8,
          votes: 0,
        },
        {
          number: 9,
          votes: 0,
        },
        {
          number: 11,
          votes: 113,
        },
        {
          number: 12,
          votes: 0,
        },
      ],
    },
    {
      number: 3,
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
};

export const dataEntryRequestWithGaps: DataEntry = {
  progress: 86,
  data: noRecountNoDifferencesDataEntryWithGaps,
  client_state: {
    furthest: "political_group_votes_3",
    current: "political_group_votes_3",
    acceptedErrorsAndWarnings: [],
    continue: true,
  },
};
