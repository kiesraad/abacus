import type {
  CandidateNomination,
  CommitteeSession,
  ElectionSummary,
  ElectionWithPoliticalGroups,
  SeatAssignment,
} from "@/types/generated/openapi";

export const seat_assignment: SeatAssignment = {
  seats: 6,
  full_seats: 2,
  residual_seats: 4,
  quota: {
    integer: 10,
    numerator: 0,
    denominator: 6,
  },
  steps: [
    {
      residual_seat_number: 1,
      change: {
        changed_by: "LargestRemainderAssignment",
        selected_list_number: 3,
        list_options: [3],
        list_assigned: [3],
        remainder_votes: {
          integer: 0,
          numerator: 0,
          denominator: 6,
        },
      },
      standings: [
        {
          list_number: 1,
          votes_cast: 5,
          remainder_votes: {
            integer: 5,
            numerator: 0,
            denominator: 6,
          },
          meets_remainder_threshold: false,
          next_votes_per_seat: {
            integer: 5,
            numerator: 0,
            denominator: 1,
          },
          full_seats: 0,
          residual_seats: 0,
        },
        {
          list_number: 2,
          votes_cast: 5,
          remainder_votes: {
            integer: 5,
            numerator: 0,
            denominator: 6,
          },
          meets_remainder_threshold: false,
          next_votes_per_seat: {
            integer: 5,
            numerator: 0,
            denominator: 1,
          },
          full_seats: 0,
          residual_seats: 0,
        },
        {
          list_number: 3,
          votes_cast: 50,
          remainder_votes: {
            integer: 0,
            numerator: 0,
            denominator: 6,
          },
          meets_remainder_threshold: true,
          next_votes_per_seat: {
            integer: 8,
            numerator: 2,
            denominator: 6,
          },
          full_seats: 5,
          residual_seats: 0,
        },
      ],
    },
    {
      change: {
        changed_by: "ListExhaustionRemoval",
        list_retracted_seat: 3,
        full_seat: false,
      },
      standings: [
        {
          list_number: 1,
          votes_cast: 5,
          remainder_votes: {
            integer: 5,
            numerator: 0,
            denominator: 6,
          },
          meets_remainder_threshold: false,
          next_votes_per_seat: {
            integer: 5,
            numerator: 0,
            denominator: 1,
          },
          full_seats: 0,
          residual_seats: 0,
        },
        {
          list_number: 2,
          votes_cast: 5,
          remainder_votes: {
            integer: 5,
            numerator: 0,
            denominator: 6,
          },
          meets_remainder_threshold: false,
          next_votes_per_seat: {
            integer: 5,
            numerator: 0,
            denominator: 1,
          },
          full_seats: 0,
          residual_seats: 0,
        },
        {
          list_number: 3,
          votes_cast: 50,
          remainder_votes: {
            integer: 0,
            numerator: 0,
            denominator: 6,
          },
          meets_remainder_threshold: true,
          next_votes_per_seat: {
            integer: 7,
            numerator: 1,
            denominator: 7,
          },
          full_seats: 5,
          residual_seats: 0,
        },
      ],
    },
    {
      change: {
        changed_by: "ListExhaustionRemoval",
        list_retracted_seat: 3,
        full_seat: true,
      },
      standings: [
        {
          list_number: 1,
          votes_cast: 5,
          remainder_votes: {
            integer: 5,
            numerator: 0,
            denominator: 6,
          },
          meets_remainder_threshold: false,
          next_votes_per_seat: {
            integer: 5,
            numerator: 0,
            denominator: 1,
          },
          full_seats: 0,
          residual_seats: 0,
        },
        {
          list_number: 2,
          votes_cast: 5,
          remainder_votes: {
            integer: 5,
            numerator: 0,
            denominator: 6,
          },
          meets_remainder_threshold: false,
          next_votes_per_seat: {
            integer: 5,
            numerator: 0,
            denominator: 1,
          },
          full_seats: 0,
          residual_seats: 0,
        },
        {
          list_number: 3,
          votes_cast: 50,
          remainder_votes: {
            integer: 0,
            numerator: 0,
            denominator: 6,
          },
          meets_remainder_threshold: true,
          next_votes_per_seat: {
            integer: 7,
            numerator: 1,
            denominator: 7,
          },
          full_seats: 4,
          residual_seats: 0,
        },
      ],
    },
    {
      change: {
        changed_by: "ListExhaustionRemoval",
        list_retracted_seat: 3,
        full_seat: true,
      },
      standings: [
        {
          list_number: 1,
          votes_cast: 5,
          remainder_votes: {
            integer: 5,
            numerator: 0,
            denominator: 6,
          },
          meets_remainder_threshold: false,
          next_votes_per_seat: {
            integer: 5,
            numerator: 0,
            denominator: 1,
          },
          full_seats: 0,
          residual_seats: 0,
        },
        {
          list_number: 2,
          votes_cast: 5,
          remainder_votes: {
            integer: 5,
            numerator: 0,
            denominator: 6,
          },
          meets_remainder_threshold: false,
          next_votes_per_seat: {
            integer: 5,
            numerator: 0,
            denominator: 1,
          },
          full_seats: 0,
          residual_seats: 0,
        },
        {
          list_number: 3,
          votes_cast: 50,
          remainder_votes: {
            integer: 0,
            numerator: 0,
            denominator: 6,
          },
          meets_remainder_threshold: true,
          next_votes_per_seat: {
            integer: 7,
            numerator: 1,
            denominator: 7,
          },
          full_seats: 3,
          residual_seats: 0,
        },
      ],
    },
    {
      change: {
        changed_by: "ListExhaustionRemoval",
        list_retracted_seat: 3,
        full_seat: true,
      },
      standings: [
        {
          list_number: 1,
          votes_cast: 5,
          remainder_votes: {
            integer: 5,
            numerator: 0,
            denominator: 6,
          },
          meets_remainder_threshold: false,
          next_votes_per_seat: {
            integer: 5,
            numerator: 0,
            denominator: 1,
          },
          full_seats: 0,
          residual_seats: 0,
        },
        {
          list_number: 2,
          votes_cast: 5,
          remainder_votes: {
            integer: 5,
            numerator: 0,
            denominator: 6,
          },
          meets_remainder_threshold: false,
          next_votes_per_seat: {
            integer: 5,
            numerator: 0,
            denominator: 1,
          },
          full_seats: 0,
          residual_seats: 0,
        },
        {
          list_number: 3,
          votes_cast: 50,
          remainder_votes: {
            integer: 0,
            numerator: 0,
            denominator: 6,
          },
          meets_remainder_threshold: true,
          next_votes_per_seat: {
            integer: 7,
            numerator: 1,
            denominator: 7,
          },
          full_seats: 2,
          residual_seats: 0,
        },
      ],
    },
    {
      residual_seat_number: 2,
      change: {
        changed_by: "UniqueHighestAverageAssignment",
        selected_list_number: 1,
        list_options: [1, 2],
        list_assigned: [1],
        list_exhausted: [3],
        votes_per_seat: {
          integer: 5,
          numerator: 0,
          denominator: 1,
        },
      },
      standings: [
        {
          list_number: 1,
          votes_cast: 5,
          remainder_votes: {
            integer: 5,
            numerator: 0,
            denominator: 6,
          },
          meets_remainder_threshold: false,
          next_votes_per_seat: {
            integer: 5,
            numerator: 0,
            denominator: 1,
          },
          full_seats: 0,
          residual_seats: 0,
        },
        {
          list_number: 2,
          votes_cast: 5,
          remainder_votes: {
            integer: 5,
            numerator: 0,
            denominator: 6,
          },
          meets_remainder_threshold: false,
          next_votes_per_seat: {
            integer: 5,
            numerator: 0,
            denominator: 1,
          },
          full_seats: 0,
          residual_seats: 0,
        },
        {
          list_number: 3,
          votes_cast: 50,
          remainder_votes: {
            integer: 0,
            numerator: 0,
            denominator: 6,
          },
          meets_remainder_threshold: true,
          next_votes_per_seat: {
            integer: 7,
            numerator: 1,
            denominator: 7,
          },
          full_seats: 2,
          residual_seats: 0,
        },
      ],
    },
    {
      residual_seat_number: 3,
      change: {
        changed_by: "UniqueHighestAverageAssignment",
        selected_list_number: 2,
        list_options: [2],
        list_assigned: [1, 2],
        list_exhausted: [3],
        votes_per_seat: {
          integer: 5,
          numerator: 0,
          denominator: 1,
        },
      },
      standings: [
        {
          list_number: 1,
          votes_cast: 5,
          remainder_votes: {
            integer: 5,
            numerator: 0,
            denominator: 6,
          },
          meets_remainder_threshold: false,
          next_votes_per_seat: {
            integer: 2,
            numerator: 1,
            denominator: 2,
          },
          full_seats: 0,
          residual_seats: 1,
        },
        {
          list_number: 2,
          votes_cast: 5,
          remainder_votes: {
            integer: 5,
            numerator: 0,
            denominator: 6,
          },
          meets_remainder_threshold: false,
          next_votes_per_seat: {
            integer: 5,
            numerator: 0,
            denominator: 1,
          },
          full_seats: 0,
          residual_seats: 0,
        },
        {
          list_number: 3,
          votes_cast: 50,
          remainder_votes: {
            integer: 0,
            numerator: 0,
            denominator: 6,
          },
          meets_remainder_threshold: true,
          next_votes_per_seat: {
            integer: 7,
            numerator: 1,
            denominator: 7,
          },
          full_seats: 2,
          residual_seats: 0,
        },
      ],
    },
    {
      residual_seat_number: 4,
      change: {
        changed_by: "HighestAverageAssignment",
        selected_list_number: 1,
        list_options: [1, 2],
        list_assigned: [1],
        list_exhausted: [3],
        votes_per_seat: {
          integer: 2,
          numerator: 1,
          denominator: 2,
        },
      },
      standings: [
        {
          list_number: 1,
          votes_cast: 5,
          remainder_votes: {
            integer: 5,
            numerator: 0,
            denominator: 6,
          },
          meets_remainder_threshold: false,
          next_votes_per_seat: {
            integer: 2,
            numerator: 1,
            denominator: 2,
          },
          full_seats: 0,
          residual_seats: 1,
        },
        {
          list_number: 2,
          votes_cast: 5,
          remainder_votes: {
            integer: 5,
            numerator: 0,
            denominator: 6,
          },
          meets_remainder_threshold: false,
          next_votes_per_seat: {
            integer: 2,
            numerator: 1,
            denominator: 2,
          },
          full_seats: 0,
          residual_seats: 1,
        },
        {
          list_number: 3,
          votes_cast: 50,
          remainder_votes: {
            integer: 0,
            numerator: 0,
            denominator: 6,
          },
          meets_remainder_threshold: true,
          next_votes_per_seat: {
            integer: 7,
            numerator: 1,
            denominator: 7,
          },
          full_seats: 2,
          residual_seats: 0,
        },
      ],
    },
    {
      residual_seat_number: 5,
      change: {
        changed_by: "HighestAverageAssignment",
        selected_list_number: 2,
        list_options: [2],
        list_assigned: [1, 2],
        list_exhausted: [1, 3],
        votes_per_seat: {
          integer: 2,
          numerator: 1,
          denominator: 2,
        },
      },
      standings: [
        {
          list_number: 1,
          votes_cast: 5,
          remainder_votes: {
            integer: 5,
            numerator: 0,
            denominator: 6,
          },
          meets_remainder_threshold: false,
          next_votes_per_seat: {
            integer: 1,
            numerator: 2,
            denominator: 3,
          },
          full_seats: 0,
          residual_seats: 2,
        },
        {
          list_number: 2,
          votes_cast: 5,
          remainder_votes: {
            integer: 5,
            numerator: 0,
            denominator: 6,
          },
          meets_remainder_threshold: false,
          next_votes_per_seat: {
            integer: 2,
            numerator: 1,
            denominator: 2,
          },
          full_seats: 0,
          residual_seats: 1,
        },
        {
          list_number: 3,
          votes_cast: 50,
          remainder_votes: {
            integer: 0,
            numerator: 0,
            denominator: 6,
          },
          meets_remainder_threshold: true,
          next_votes_per_seat: {
            integer: 7,
            numerator: 1,
            denominator: 7,
          },
          full_seats: 2,
          residual_seats: 0,
        },
      ],
    },
  ],
  final_standing: [
    {
      list_number: 1,
      votes_cast: 5,
      remainder_votes: {
        integer: 5,
        numerator: 0,
        denominator: 6,
      },
      meets_remainder_threshold: false,
      full_seats: 0,
      residual_seats: 2,
      total_seats: 2,
    },
    {
      list_number: 2,
      votes_cast: 5,
      remainder_votes: {
        integer: 5,
        numerator: 0,
        denominator: 6,
      },
      meets_remainder_threshold: false,
      full_seats: 0,
      residual_seats: 2,
      total_seats: 2,
    },
    {
      list_number: 3,
      votes_cast: 50,
      remainder_votes: {
        integer: 0,
        numerator: 0,
        denominator: 6,
      },
      meets_remainder_threshold: true,
      full_seats: 2,
      residual_seats: 0,
      total_seats: 2,
    },
  ],
};

export const candidate_nomination: CandidateNomination = {
  preference_threshold: {
    percentage: 50,
    number_of_votes: {
      integer: 5,
      numerator: 0,
      denominator: 600,
    },
  },
  chosen_candidates: [
    {
      number: 1,
      initials: "T.",
      first_name: "Tinus",
      last_name: "Bakker",
      locality: "Test Location",
      gender: "Male",
      country_code: "BE",
      list_number: 2,
      list_name: "Political Group B",
    },
    {
      number: 2,
      initials: "E.",
      first_name: "Eva",
      last_name: "Koster",
      locality: "Test Location",
      gender: "Female",
      list_number: 3,
      list_name: "Political Group C",
    },
    {
      number: 2,
      initials: "J.",
      first_name: "Johan",
      last_name: "Oud",
      locality: "Test Location",
      gender: "Male",
      list_number: 1,
      list_name: "Political Group A",
    },
    {
      number: 1,
      initials: "L.",
      first_name: "Lidewij",
      last_name: "Oud",
      locality: "Test Location",
      gender: "Female",
      list_number: 1,
      list_name: "Political Group A",
    },
    {
      number: 2,
      initials: "D.",
      last_name: "Po",
      locality: "Test Location",
      gender: "X",
      list_number: 2,
      list_name: "Political Group B",
    },
    {
      number: 1,
      initials: "G.",
      first_name: "Gert",
      last_name: "Smit",
      locality: "Test Location",
      gender: "Male",
      list_number: 3,
      list_name: "Political Group C",
    },
  ],
  list_candidate_nomination: [
    {
      list_number: 1,
      list_name: "Political Group A",
      list_seats: 2,
      preferential_candidate_nomination: [],
      other_candidate_nomination: [
        {
          number: 1,
          votes: 3,
        },
        {
          number: 2,
          votes: 2,
        },
      ],
      updated_candidate_ranking: [],
    },
    {
      list_number: 2,
      list_name: "Political Group B",
      list_seats: 2,
      preferential_candidate_nomination: [],
      other_candidate_nomination: [
        {
          number: 1,
          votes: 3,
        },
        {
          number: 2,
          votes: 2,
        },
      ],
      updated_candidate_ranking: [],
    },
    {
      list_number: 3,
      list_name: "Political Group C",
      list_seats: 2,
      preferential_candidate_nomination: [
        {
          number: 1,
          votes: 25,
        },
        {
          number: 2,
          votes: 25,
        },
      ],
      other_candidate_nomination: [],
      updated_candidate_ranking: [],
    },
  ],
};

export const election_summary: ElectionSummary = {
  voters_counts: {
    poll_card_count: 60,
    proxy_certificate_count: 1,
    total_admitted_voters_count: 61,
  },
  votes_counts: {
    political_group_total_votes: [
      { number: 1, total: 5 },
      { number: 2, total: 5 },
      { number: 3, total: 50 },
    ],
    total_votes_candidates_count: 60,
    blank_votes_count: 0,
    invalid_votes_count: 1,
    total_votes_cast_count: 61,
  },
  differences_counts: {
    more_ballots_count: {
      count: 0,
      data_entry_sources: [],
    },
    fewer_ballots_count: {
      count: 0,
      data_entry_sources: [],
    },
  },
  polling_station_investigations: {
    admitted_voters_recounted: [],
    ballots_recounted: [],
    investigated_other_reason: [],
  },
  political_group_votes: [
    {
      number: 1,
      total: 5,
      candidate_votes: [
        {
          number: 1,
          votes: 3,
        },
        {
          number: 2,
          votes: 2,
        },
      ],
    },
    {
      number: 2,
      total: 5,
      candidate_votes: [
        {
          number: 1,
          votes: 3,
        },
        {
          number: 2,
          votes: 2,
        },
      ],
    },
    {
      number: 3,
      total: 50,
      candidate_votes: [
        {
          number: 1,
          votes: 25,
        },
        {
          number: 2,
          votes: 25,
        },
      ],
    },
  ],
};

export const committee_session: CommitteeSession = {
  id: 6,
  number: 1,
  election_id: 6,
  status: "completed",
  location: "",
  start_date_time: "",
};

export const election: ElectionWithPoliticalGroups = {
  id: 6,
  name: "Test Election < 19 seats & List Exhaustion",
  counting_method: "CSO",
  committee_category: "CSB",
  election_id: "TestLocation_2026",
  location: "Test Location",
  domain_id: "0000",
  category: "Municipal",
  number_of_seats: 6,
  election_date: "2026-03-18",
  nomination_date: "2026-02-02",
  number_of_voters: 100,
  political_groups: [
    {
      number: 1,
      name: "Political Group A",
      candidates: [
        {
          number: 1,
          initials: "L.",
          first_name: "Lidewij",
          last_name: "Oud",
          locality: "Test Location",
          gender: "Female",
        },
        {
          number: 2,
          initials: "J.",
          first_name: "Johan",
          last_name: "Oud",
          locality: "Test Location",
          gender: "Male",
        },
      ],
    },
    {
      number: 2,
      name: "Political Group B",
      candidates: [
        {
          number: 1,
          initials: "T.",
          first_name: "Tinus",
          last_name: "Bakker",
          locality: "Test Location",
          gender: "Male",
          country_code: "BE",
        },
        {
          number: 2,
          initials: "D.",
          last_name: "Po",
          locality: "Test Location",
          gender: "X",
        },
      ],
    },
    {
      number: 3,
      name: "Blanco (Smit, G.)",
      candidates: [
        {
          number: 1,
          initials: "G.",
          first_name: "Gert",
          last_name: "Smit",
          locality: "Test Location",
          gender: "Male",
        },
        {
          number: 2,
          initials: "E.",
          first_name: "Eva",
          last_name: "Koster",
          locality: "Test Location",
          gender: "Female",
        },
      ],
    },
  ],
};
