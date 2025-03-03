import { Election, ElectionSummary, SeatAssignmentResult } from "@kiesraad/api";

export const seat_assignment: SeatAssignmentResult = {
  seats: 23,
  full_seats: 19,
  residual_seats: 4,
  quota: {
    integer: 52,
    numerator: 4,
    denominator: 23,
  },
  steps: [
    {
      residual_seat_number: 1,
      change: {
        assigned_by: "LargestAverage",
        selected_pg_number: 5,
        pg_options: [5],
        pg_assigned: [5],
        votes_per_seat: {
          integer: 50,
          numerator: 1,
          denominator: 2,
        },
      },
      standing: [
        {
          pg_number: 1,
          votes_cast: 600,
          remainder_votes: {
            integer: 26,
            numerator: 2,
            denominator: 23,
          },
          meets_remainder_threshold: true,
          next_votes_per_seat: {
            integer: 50,
            numerator: 0,
            denominator: 12,
          },
          full_seats: 11,
          residual_seats: 0,
        },
        {
          pg_number: 2,
          votes_cast: 302,
          remainder_votes: {
            integer: 41,
            numerator: 3,
            denominator: 23,
          },
          meets_remainder_threshold: true,
          next_votes_per_seat: {
            integer: 50,
            numerator: 2,
            denominator: 6,
          },
          full_seats: 5,
          residual_seats: 0,
        },
        {
          pg_number: 3,
          votes_cast: 98,
          remainder_votes: {
            integer: 45,
            numerator: 19,
            denominator: 23,
          },
          meets_remainder_threshold: true,
          next_votes_per_seat: {
            integer: 49,
            numerator: 0,
            denominator: 2,
          },
          full_seats: 1,
          residual_seats: 0,
        },
        {
          pg_number: 4,
          votes_cast: 99,
          remainder_votes: {
            integer: 46,
            numerator: 19,
            denominator: 23,
          },
          meets_remainder_threshold: true,
          next_votes_per_seat: {
            integer: 49,
            numerator: 1,
            denominator: 2,
          },
          full_seats: 1,
          residual_seats: 0,
        },
        {
          pg_number: 5,
          votes_cast: 101,
          remainder_votes: {
            integer: 48,
            numerator: 19,
            denominator: 23,
          },
          meets_remainder_threshold: true,
          next_votes_per_seat: {
            integer: 50,
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
        assigned_by: "LargestAverage",
        selected_pg_number: 2,
        pg_options: [2],
        pg_assigned: [2],
        votes_per_seat: {
          integer: 50,
          numerator: 2,
          denominator: 6,
        },
      },
      standing: [
        {
          pg_number: 1,
          votes_cast: 600,
          remainder_votes: {
            integer: 26,
            numerator: 2,
            denominator: 23,
          },
          meets_remainder_threshold: true,
          next_votes_per_seat: {
            integer: 50,
            numerator: 0,
            denominator: 12,
          },
          full_seats: 11,
          residual_seats: 0,
        },
        {
          pg_number: 2,
          votes_cast: 302,
          remainder_votes: {
            integer: 41,
            numerator: 3,
            denominator: 23,
          },
          meets_remainder_threshold: true,
          next_votes_per_seat: {
            integer: 50,
            numerator: 2,
            denominator: 6,
          },
          full_seats: 5,
          residual_seats: 0,
        },
        {
          pg_number: 3,
          votes_cast: 98,
          remainder_votes: {
            integer: 45,
            numerator: 19,
            denominator: 23,
          },
          meets_remainder_threshold: true,
          next_votes_per_seat: {
            integer: 49,
            numerator: 0,
            denominator: 2,
          },
          full_seats: 1,
          residual_seats: 0,
        },
        {
          pg_number: 4,
          votes_cast: 99,
          remainder_votes: {
            integer: 46,
            numerator: 19,
            denominator: 23,
          },
          meets_remainder_threshold: true,
          next_votes_per_seat: {
            integer: 49,
            numerator: 1,
            denominator: 2,
          },
          full_seats: 1,
          residual_seats: 0,
        },
        {
          pg_number: 5,
          votes_cast: 101,
          remainder_votes: {
            integer: 48,
            numerator: 19,
            denominator: 23,
          },
          meets_remainder_threshold: true,
          next_votes_per_seat: {
            integer: 33,
            numerator: 2,
            denominator: 3,
          },
          full_seats: 1,
          residual_seats: 1,
        },
      ],
    },
    {
      residual_seat_number: 3,
      change: {
        assigned_by: "LargestAverage",
        selected_pg_number: 1,
        pg_options: [1],
        pg_assigned: [1],
        votes_per_seat: {
          integer: 50,
          numerator: 0,
          denominator: 12,
        },
      },
      standing: [
        {
          pg_number: 1,
          votes_cast: 600,
          remainder_votes: {
            integer: 26,
            numerator: 2,
            denominator: 23,
          },
          meets_remainder_threshold: true,
          next_votes_per_seat: {
            integer: 50,
            numerator: 0,
            denominator: 12,
          },
          full_seats: 11,
          residual_seats: 0,
        },
        {
          pg_number: 2,
          votes_cast: 302,
          remainder_votes: {
            integer: 41,
            numerator: 3,
            denominator: 23,
          },
          meets_remainder_threshold: true,
          next_votes_per_seat: {
            integer: 43,
            numerator: 1,
            denominator: 7,
          },
          full_seats: 5,
          residual_seats: 1,
        },
        {
          pg_number: 3,
          votes_cast: 98,
          remainder_votes: {
            integer: 45,
            numerator: 19,
            denominator: 23,
          },
          meets_remainder_threshold: true,
          next_votes_per_seat: {
            integer: 49,
            numerator: 0,
            denominator: 2,
          },
          full_seats: 1,
          residual_seats: 0,
        },
        {
          pg_number: 4,
          votes_cast: 99,
          remainder_votes: {
            integer: 46,
            numerator: 19,
            denominator: 23,
          },
          meets_remainder_threshold: true,
          next_votes_per_seat: {
            integer: 49,
            numerator: 1,
            denominator: 2,
          },
          full_seats: 1,
          residual_seats: 0,
        },
        {
          pg_number: 5,
          votes_cast: 101,
          remainder_votes: {
            integer: 48,
            numerator: 19,
            denominator: 23,
          },
          meets_remainder_threshold: true,
          next_votes_per_seat: {
            integer: 33,
            numerator: 2,
            denominator: 3,
          },
          full_seats: 1,
          residual_seats: 1,
        },
      ],
    },
    {
      residual_seat_number: 4,
      change: {
        assigned_by: "LargestAverage",
        selected_pg_number: 4,
        pg_options: [4],
        pg_assigned: [4],
        votes_per_seat: {
          integer: 49,
          numerator: 1,
          denominator: 2,
        },
      },
      standing: [
        {
          pg_number: 1,
          votes_cast: 600,
          remainder_votes: {
            integer: 26,
            numerator: 2,
            denominator: 23,
          },
          meets_remainder_threshold: true,
          next_votes_per_seat: {
            integer: 46,
            numerator: 2,
            denominator: 13,
          },
          full_seats: 11,
          residual_seats: 1,
        },
        {
          pg_number: 2,
          votes_cast: 302,
          remainder_votes: {
            integer: 41,
            numerator: 3,
            denominator: 23,
          },
          meets_remainder_threshold: true,
          next_votes_per_seat: {
            integer: 43,
            numerator: 1,
            denominator: 7,
          },
          full_seats: 5,
          residual_seats: 1,
        },
        {
          pg_number: 3,
          votes_cast: 98,
          remainder_votes: {
            integer: 45,
            numerator: 19,
            denominator: 23,
          },
          meets_remainder_threshold: true,
          next_votes_per_seat: {
            integer: 49,
            numerator: 0,
            denominator: 2,
          },
          full_seats: 1,
          residual_seats: 0,
        },
        {
          pg_number: 4,
          votes_cast: 99,
          remainder_votes: {
            integer: 46,
            numerator: 19,
            denominator: 23,
          },
          meets_remainder_threshold: true,
          next_votes_per_seat: {
            integer: 49,
            numerator: 1,
            denominator: 2,
          },
          full_seats: 1,
          residual_seats: 0,
        },
        {
          pg_number: 5,
          votes_cast: 101,
          remainder_votes: {
            integer: 48,
            numerator: 19,
            denominator: 23,
          },
          meets_remainder_threshold: true,
          next_votes_per_seat: {
            integer: 33,
            numerator: 2,
            denominator: 3,
          },
          full_seats: 1,
          residual_seats: 1,
        },
      ],
    },
  ],
  final_standing: [
    {
      pg_number: 1,
      votes_cast: 600,
      remainder_votes: {
        integer: 26,
        numerator: 2,
        denominator: 23,
      },
      meets_remainder_threshold: true,
      full_seats: 11,
      residual_seats: 1,
      total_seats: 12,
    },
    {
      pg_number: 2,
      votes_cast: 302,
      remainder_votes: {
        integer: 41,
        numerator: 3,
        denominator: 23,
      },
      meets_remainder_threshold: true,
      full_seats: 5,
      residual_seats: 1,
      total_seats: 6,
    },
    {
      pg_number: 3,
      votes_cast: 98,
      remainder_votes: {
        integer: 45,
        numerator: 19,
        denominator: 23,
      },
      meets_remainder_threshold: true,
      full_seats: 1,
      residual_seats: 0,
      total_seats: 1,
    },
    {
      pg_number: 4,
      votes_cast: 99,
      remainder_votes: {
        integer: 46,
        numerator: 19,
        denominator: 23,
      },
      meets_remainder_threshold: true,
      full_seats: 1,
      residual_seats: 1,
      total_seats: 2,
    },
    {
      pg_number: 5,
      votes_cast: 101,
      remainder_votes: {
        integer: 48,
        numerator: 19,
        denominator: 23,
      },
      meets_remainder_threshold: true,
      full_seats: 1,
      residual_seats: 1,
      total_seats: 2,
    },
  ],
};

export const election_summary: ElectionSummary = {
  voters_counts: {
    poll_card_count: 1200,
    proxy_certificate_count: 2,
    voter_card_count: 3,
    total_admitted_voters_count: 1205,
  },
  votes_counts: {
    votes_candidates_count: 1200,
    blank_votes_count: 3,
    invalid_votes_count: 2,
    total_votes_cast_count: 1205,
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
      total: 600,
      candidate_votes: [
        {
          number: 1,
          votes: 400,
        },
        {
          number: 2,
          votes: 200,
        },
      ],
    },
    {
      number: 2,
      total: 302,
      candidate_votes: [
        {
          number: 1,
          votes: 200,
        },
        {
          number: 2,
          votes: 102,
        },
      ],
    },
    {
      number: 3,
      total: 98,
      candidate_votes: [
        {
          number: 1,
          votes: 50,
        },
        {
          number: 2,
          votes: 48,
        },
      ],
    },
    {
      number: 4,
      total: 99,
      candidate_votes: [
        {
          number: 1,
          votes: 60,
        },
        {
          number: 2,
          votes: 39,
        },
      ],
    },
    {
      number: 5,
      total: 101,
      candidate_votes: [
        {
          number: 1,
          votes: 70,
        },
        {
          number: 2,
          votes: 31,
        },
      ],
    },
  ],
};

export const election: Election = {
  id: 1,
  name: "Test Election >= 19 seats",
  location: "Test Location",
  number_of_voters: 2000,
  category: "Municipal",
  number_of_seats: 23,
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
