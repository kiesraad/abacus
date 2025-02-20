import { ApportionmentResult, Election, ElectionSummary } from "@kiesraad/api";

export const apportionment: ApportionmentResult = {
  seats: 15,
  full_seats: 12,
  residual_seats: 3,
  quota: {
    integer: 340,
    numerator: 4,
    denominator: 15,
  },
  steps: [
    {
      residual_seat_number: 1,
      change: {
        assigned_by: "LargestRemainder",
        selected_pg_number: 2,
        pg_options: [2],
        pg_assigned: [2],
        remainder_votes: {
          integer: 296,
          numerator: 7,
          denominator: 15,
        },
      },
      standing: [
        {
          pg_number: 1,
          votes_cast: 2571,
          remainder_votes: {
            integer: 189,
            numerator: 2,
            denominator: 15,
          },
          meets_remainder_threshold: true,
          next_votes_per_seat: {
            integer: 321,
            numerator: 3,
            denominator: 8,
          },
          full_seats: 7,
          residual_seats: 0,
        },
        {
          pg_number: 2,
          votes_cast: 977,
          remainder_votes: {
            integer: 296,
            numerator: 7,
            denominator: 15,
          },
          meets_remainder_threshold: true,
          next_votes_per_seat: {
            integer: 325,
            numerator: 2,
            denominator: 3,
          },
          full_seats: 2,
          residual_seats: 0,
        },
        {
          pg_number: 3,
          votes_cast: 567,
          remainder_votes: {
            integer: 226,
            numerator: 11,
            denominator: 15,
          },
          meets_remainder_threshold: true,
          next_votes_per_seat: {
            integer: 283,
            numerator: 1,
            denominator: 2,
          },
          full_seats: 1,
          residual_seats: 0,
        },
        {
          pg_number: 4,
          votes_cast: 536,
          remainder_votes: {
            integer: 195,
            numerator: 11,
            denominator: 15,
          },
          meets_remainder_threshold: true,
          next_votes_per_seat: {
            integer: 268,
            numerator: 0,
            denominator: 2,
          },
          full_seats: 1,
          residual_seats: 0,
        },
        {
          pg_number: 5,
          votes_cast: 453,
          remainder_votes: {
            integer: 112,
            numerator: 11,
            denominator: 15,
          },
          meets_remainder_threshold: true,
          next_votes_per_seat: {
            integer: 226,
            numerator: 1,
            denominator: 2,
          },
          full_seats: 1,
          residual_seats: 0,
        },
      ],
    },
    {
      residual_seat_number: 2,
      change: {
        assigned_by: "LargestRemainder",
        selected_pg_number: 3,
        pg_options: [3],
        pg_assigned: [3],
        remainder_votes: {
          integer: 226,
          numerator: 11,
          denominator: 15,
        },
      },
      standing: [
        {
          pg_number: 1,
          votes_cast: 2571,
          remainder_votes: {
            integer: 189,
            numerator: 2,
            denominator: 15,
          },
          meets_remainder_threshold: true,
          next_votes_per_seat: {
            integer: 321,
            numerator: 3,
            denominator: 8,
          },
          full_seats: 7,
          residual_seats: 0,
        },
        {
          pg_number: 2,
          votes_cast: 977,
          remainder_votes: {
            integer: 296,
            numerator: 7,
            denominator: 15,
          },
          meets_remainder_threshold: true,
          next_votes_per_seat: {
            integer: 244,
            numerator: 1,
            denominator: 4,
          },
          full_seats: 2,
          residual_seats: 1,
        },
        {
          pg_number: 3,
          votes_cast: 567,
          remainder_votes: {
            integer: 226,
            numerator: 11,
            denominator: 15,
          },
          meets_remainder_threshold: true,
          next_votes_per_seat: {
            integer: 283,
            numerator: 1,
            denominator: 2,
          },
          full_seats: 1,
          residual_seats: 0,
        },
        {
          pg_number: 4,
          votes_cast: 536,
          remainder_votes: {
            integer: 195,
            numerator: 11,
            denominator: 15,
          },
          meets_remainder_threshold: true,
          next_votes_per_seat: {
            integer: 268,
            numerator: 0,
            denominator: 2,
          },
          full_seats: 1,
          residual_seats: 0,
        },
        {
          pg_number: 5,
          votes_cast: 453,
          remainder_votes: {
            integer: 112,
            numerator: 11,
            denominator: 15,
          },
          meets_remainder_threshold: true,
          next_votes_per_seat: {
            integer: 226,
            numerator: 1,
            denominator: 2,
          },
          full_seats: 1,
          residual_seats: 0,
        },
      ],
    },
    {
      residual_seat_number: 3,
      change: {
        assigned_by: "LargestRemainder",
        selected_pg_number: 4,
        pg_options: [4],
        pg_assigned: [4],
        remainder_votes: {
          integer: 195,
          numerator: 11,
          denominator: 15,
        },
      },
      standing: [
        {
          pg_number: 1,
          votes_cast: 2571,
          remainder_votes: {
            integer: 189,
            numerator: 2,
            denominator: 15,
          },
          meets_remainder_threshold: true,
          next_votes_per_seat: {
            integer: 321,
            numerator: 3,
            denominator: 8,
          },
          full_seats: 7,
          residual_seats: 0,
        },
        {
          pg_number: 2,
          votes_cast: 977,
          remainder_votes: {
            integer: 296,
            numerator: 7,
            denominator: 15,
          },
          meets_remainder_threshold: true,
          next_votes_per_seat: {
            integer: 244,
            numerator: 1,
            denominator: 4,
          },
          full_seats: 2,
          residual_seats: 1,
        },
        {
          pg_number: 3,
          votes_cast: 567,
          remainder_votes: {
            integer: 226,
            numerator: 11,
            denominator: 15,
          },
          meets_remainder_threshold: true,
          next_votes_per_seat: {
            integer: 189,
            numerator: 0,
            denominator: 3,
          },
          full_seats: 1,
          residual_seats: 1,
        },
        {
          pg_number: 4,
          votes_cast: 536,
          remainder_votes: {
            integer: 195,
            numerator: 11,
            denominator: 15,
          },
          meets_remainder_threshold: true,
          next_votes_per_seat: {
            integer: 268,
            numerator: 0,
            denominator: 2,
          },
          full_seats: 1,
          residual_seats: 0,
        },
        {
          pg_number: 5,
          votes_cast: 453,
          remainder_votes: {
            integer: 112,
            numerator: 11,
            denominator: 15,
          },
          meets_remainder_threshold: true,
          next_votes_per_seat: {
            integer: 226,
            numerator: 1,
            denominator: 2,
          },
          full_seats: 1,
          residual_seats: 0,
        },
      ],
    },
    {
      residual_seat_number: 3,
      change: {
        assigned_by: "AbsoluteMajorityChange",
        pg_retracted_seat: 4,
        pg_assigned_seat: 1,
      },
      standing: [
        {
          pg_number: 1,
          votes_cast: 2571,
          surplus_votes: {
            integer: 189,
            numerator: 2,
            denominator: 15,
          },
          meets_surplus_threshold: true,
          next_votes_per_seat: {
            integer: 321,
            numerator: 3,
            denominator: 8,
          },
          whole_seats: 7,
          residual_seats: 1,
        },
        {
          pg_number: 2,
          votes_cast: 977,
          surplus_votes: {
            integer: 296,
            numerator: 7,
            denominator: 15,
          },
          meets_surplus_threshold: true,
          next_votes_per_seat: {
            integer: 244,
            numerator: 1,
            denominator: 4,
          },
          whole_seats: 2,
          residual_seats: 1,
        },
        {
          pg_number: 3,
          votes_cast: 567,
          surplus_votes: {
            integer: 226,
            numerator: 11,
            denominator: 15,
          },
          meets_surplus_threshold: true,
          next_votes_per_seat: {
            integer: 189,
            numerator: 0,
            denominator: 3,
          },
          whole_seats: 1,
          residual_seats: 1,
        },
        {
          pg_number: 4,
          votes_cast: 536,
          surplus_votes: {
            integer: 195,
            numerator: 11,
            denominator: 15,
          },
          meets_surplus_threshold: true,
          next_votes_per_seat: {
            integer: 178,
            numerator: 2,
            denominator: 3,
          },
          whole_seats: 1,
          residual_seats: 0,
        },
        {
          pg_number: 5,
          votes_cast: 453,
          surplus_votes: {
            integer: 112,
            numerator: 11,
            denominator: 15,
          },
          meets_surplus_threshold: true,
          next_votes_per_seat: {
            integer: 226,
            numerator: 1,
            denominator: 2,
          },
          whole_seats: 1,
          residual_seats: 0,
        },
      ],
    },
  ],
  final_standing: [
    {
      pg_number: 1,
      votes_cast: 2571,
      remainder_votes: {
        integer: 189,
        numerator: 2,
        denominator: 15,
      },
      meets_remainder_threshold: true,
      full_seats: 7,
      residual_seats: 1,
      total_seats: 8,
    },
    {
      pg_number: 2,
      votes_cast: 977,
      remainder_votes: {
        integer: 296,
        numerator: 7,
        denominator: 15,
      },
      meets_remainder_threshold: true,
      full_seats: 2,
      residual_seats: 1,
      total_seats: 3,
    },
    {
      pg_number: 3,
      votes_cast: 567,
      remainder_votes: {
        integer: 226,
        numerator: 11,
        denominator: 15,
      },
      meets_remainder_threshold: true,
      full_seats: 1,
      residual_seats: 1,
      total_seats: 2,
    },
    {
      pg_number: 4,
      votes_cast: 536,
      remainder_votes: {
        integer: 195,
        numerator: 11,
        denominator: 15,
      },
      meets_remainder_threshold: true,
      full_seats: 1,
      residual_seats: 0,
      total_seats: 1,
    },
    {
      pg_number: 5,
      votes_cast: 453,
      remainder_votes: {
        integer: 112,
        numerator: 11,
        denominator: 15,
      },
      meets_remainder_threshold: true,
      full_seats: 1,
      residual_seats: 0,
      total_seats: 1,
    },
  ],
};

export const election_summary: ElectionSummary = {
  voters_counts: {
    poll_card_count: 5104,
    proxy_certificate_count: 0,
    voter_card_count: 0,
    total_admitted_voters_count: 5104,
  },
  votes_counts: {
    votes_candidates_count: 5104,
    blank_votes_count: 0,
    invalid_votes_count: 0,
    total_votes_cast_count: 5104,
  },
  differences_counts: {
    more_ballots_count: {
      count: 0,
      polling_stations: [],
    },
    fewer_ballots_count: {
      count: 0,
      polling_stations: [],
    },
    unreturned_ballots_count: {
      count: 0,
      polling_stations: [],
    },
    too_few_ballots_handed_out_count: {
      count: 0,
      polling_stations: [],
    },
    too_many_ballots_handed_out_count: {
      count: 0,
      polling_stations: [],
    },
    other_explanation_count: {
      count: 0,
      polling_stations: [],
    },
    no_explanation_count: {
      count: 0,
      polling_stations: [],
    },
  },
  recounted_polling_stations: [],
  political_group_votes: [
    {
      number: 1,
      total: 2571,
      candidate_votes: [
        {
          number: 1,
          votes: 1571,
        },
        {
          number: 2,
          votes: 1000,
        },
      ],
    },
    {
      number: 2,
      total: 977,
      candidate_votes: [
        {
          number: 1,
          votes: 577,
        },
        {
          number: 2,
          votes: 400,
        },
      ],
    },
    {
      number: 3,
      total: 567,
      candidate_votes: [
        {
          number: 1,
          votes: 367,
        },
        {
          number: 2,
          votes: 200,
        },
      ],
    },
    {
      number: 4,
      total: 536,
      candidate_votes: [
        {
          number: 1,
          votes: 336,
        },
        {
          number: 2,
          votes: 200,
        },
      ],
    },
    {
      number: 5,
      total: 453,
      candidate_votes: [
        {
          number: 1,
          votes: 253,
        },
        {
          number: 2,
          votes: 200,
        },
      ],
    },
  ],
};

export const election: Election = {
  id: 3,
  name: "Test Election Absolute Majority Change",
  location: "Test Location",
  number_of_voters: 6000,
  category: "Municipal",
  number_of_seats: 15,
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
    {
      number: 2,
      name: "Political Group B",
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
    {
      number: 3,
      name: "Political Group C",
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
    {
      number: 4,
      name: "Political Group D",
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
    {
      number: 5,
      name: "Political Group E",
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
