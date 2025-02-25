import { ApportionmentResult, ApportionmentStep, Election, ElectionSummary } from "@kiesraad/api";

export const highest_surplus_steps: ApportionmentStep[] = [
  {
    residual_seat_number: 1,
    change: {
      assigned_by: "HighestSurplus",
      selected_pg_number: 2,
      pg_options: [2],
      pg_assigned: [2],
      surplus_votes: {
        integer: 60,
        numerator: 0,
        denominator: 15,
      },
    },
    standing: [
      {
        pg_number: 1,
        votes_cast: 808,
        surplus_votes: {
          integer: 8,
          numerator: 0,
          denominator: 15,
        },
        meets_surplus_threshold: true,
        next_votes_per_seat: {
          integer: 73,
          numerator: 5,
          denominator: 11,
        },
        whole_seats: 10,
        residual_seats: 0,
      },
      {
        pg_number: 2,
        votes_cast: 60,
        surplus_votes: {
          integer: 60,
          numerator: 0,
          denominator: 15,
        },
        meets_surplus_threshold: true,
        next_votes_per_seat: {
          integer: 60,
          numerator: 0,
          denominator: 1,
        },
        whole_seats: 0,
        residual_seats: 0,
      },
      {
        pg_number: 3,
        votes_cast: 58,
        surplus_votes: {
          integer: 58,
          numerator: 0,
          denominator: 15,
        },
        meets_surplus_threshold: false,
        next_votes_per_seat: {
          integer: 58,
          numerator: 0,
          denominator: 1,
        },
        whole_seats: 0,
        residual_seats: 0,
      },
      {
        pg_number: 4,
        votes_cast: 57,
        surplus_votes: {
          integer: 57,
          numerator: 0,
          denominator: 15,
        },
        meets_surplus_threshold: false,
        next_votes_per_seat: {
          integer: 57,
          numerator: 0,
          denominator: 1,
        },
        whole_seats: 0,
        residual_seats: 0,
      },
      {
        pg_number: 5,
        votes_cast: 56,
        surplus_votes: {
          integer: 56,
          numerator: 0,
          denominator: 15,
        },
        meets_surplus_threshold: false,
        next_votes_per_seat: {
          integer: 56,
          numerator: 0,
          denominator: 1,
        },
        whole_seats: 0,
        residual_seats: 0,
      },
      {
        pg_number: 6,
        votes_cast: 55,
        surplus_votes: {
          integer: 55,
          numerator: 0,
          denominator: 15,
        },
        meets_surplus_threshold: false,
        next_votes_per_seat: {
          integer: 55,
          numerator: 0,
          denominator: 1,
        },
        whole_seats: 0,
        residual_seats: 0,
      },
      {
        pg_number: 7,
        votes_cast: 54,
        surplus_votes: {
          integer: 54,
          numerator: 0,
          denominator: 15,
        },
        meets_surplus_threshold: false,
        next_votes_per_seat: {
          integer: 54,
          numerator: 0,
          denominator: 1,
        },
        whole_seats: 0,
        residual_seats: 0,
      },
      {
        pg_number: 8,
        votes_cast: 52,
        surplus_votes: {
          integer: 52,
          numerator: 0,
          denominator: 15,
        },
        meets_surplus_threshold: false,
        next_votes_per_seat: {
          integer: 52,
          numerator: 0,
          denominator: 1,
        },
        whole_seats: 0,
        residual_seats: 0,
      },
    ],
  },
  {
    residual_seat_number: 2,
    change: {
      assigned_by: "HighestSurplus",
      selected_pg_number: 1,
      pg_options: [1],
      pg_assigned: [1],
      surplus_votes: {
        integer: 8,
        numerator: 0,
        denominator: 15,
      },
    },
    standing: [
      {
        pg_number: 1,
        votes_cast: 808,
        surplus_votes: {
          integer: 8,
          numerator: 0,
          denominator: 15,
        },
        meets_surplus_threshold: true,
        next_votes_per_seat: {
          integer: 73,
          numerator: 5,
          denominator: 11,
        },
        whole_seats: 10,
        residual_seats: 0,
      },
      {
        pg_number: 2,
        votes_cast: 60,
        surplus_votes: {
          integer: 60,
          numerator: 0,
          denominator: 15,
        },
        meets_surplus_threshold: true,
        next_votes_per_seat: {
          integer: 30,
          numerator: 0,
          denominator: 2,
        },
        whole_seats: 0,
        residual_seats: 1,
      },
      {
        pg_number: 3,
        votes_cast: 58,
        surplus_votes: {
          integer: 58,
          numerator: 0,
          denominator: 15,
        },
        meets_surplus_threshold: false,
        next_votes_per_seat: {
          integer: 58,
          numerator: 0,
          denominator: 1,
        },
        whole_seats: 0,
        residual_seats: 0,
      },
      {
        pg_number: 4,
        votes_cast: 57,
        surplus_votes: {
          integer: 57,
          numerator: 0,
          denominator: 15,
        },
        meets_surplus_threshold: false,
        next_votes_per_seat: {
          integer: 57,
          numerator: 0,
          denominator: 1,
        },
        whole_seats: 0,
        residual_seats: 0,
      },
      {
        pg_number: 5,
        votes_cast: 56,
        surplus_votes: {
          integer: 56,
          numerator: 0,
          denominator: 15,
        },
        meets_surplus_threshold: false,
        next_votes_per_seat: {
          integer: 56,
          numerator: 0,
          denominator: 1,
        },
        whole_seats: 0,
        residual_seats: 0,
      },
      {
        pg_number: 6,
        votes_cast: 55,
        surplus_votes: {
          integer: 55,
          numerator: 0,
          denominator: 15,
        },
        meets_surplus_threshold: false,
        next_votes_per_seat: {
          integer: 55,
          numerator: 0,
          denominator: 1,
        },
        whole_seats: 0,
        residual_seats: 0,
      },
      {
        pg_number: 7,
        votes_cast: 54,
        surplus_votes: {
          integer: 54,
          numerator: 0,
          denominator: 15,
        },
        meets_surplus_threshold: false,
        next_votes_per_seat: {
          integer: 54,
          numerator: 0,
          denominator: 1,
        },
        whole_seats: 0,
        residual_seats: 0,
      },
      {
        pg_number: 8,
        votes_cast: 52,
        surplus_votes: {
          integer: 52,
          numerator: 0,
          denominator: 15,
        },
        meets_surplus_threshold: false,
        next_votes_per_seat: {
          integer: 52,
          numerator: 0,
          denominator: 1,
        },
        whole_seats: 0,
        residual_seats: 0,
      },
    ],
  },
];

export const highest_average_steps: ApportionmentStep[] = [
  {
    residual_seat_number: 3,
    change: {
      assigned_by: "HighestAverage",
      selected_pg_number: 1,
      pg_options: [1],
      pg_assigned: [1],
      votes_per_seat: {
        integer: 67,
        numerator: 4,
        denominator: 12,
      },
    },
    standing: [
      {
        pg_number: 1,
        votes_cast: 808,
        surplus_votes: {
          integer: 8,
          numerator: 0,
          denominator: 15,
        },
        meets_surplus_threshold: true,
        next_votes_per_seat: {
          integer: 67,
          numerator: 4,
          denominator: 12,
        },
        whole_seats: 10,
        residual_seats: 1,
      },
      {
        pg_number: 2,
        votes_cast: 60,
        surplus_votes: {
          integer: 60,
          numerator: 0,
          denominator: 15,
        },
        meets_surplus_threshold: true,
        next_votes_per_seat: {
          integer: 30,
          numerator: 0,
          denominator: 2,
        },
        whole_seats: 0,
        residual_seats: 1,
      },
      {
        pg_number: 3,
        votes_cast: 58,
        surplus_votes: {
          integer: 58,
          numerator: 0,
          denominator: 15,
        },
        meets_surplus_threshold: false,
        next_votes_per_seat: {
          integer: 58,
          numerator: 0,
          denominator: 1,
        },
        whole_seats: 0,
        residual_seats: 0,
      },
      {
        pg_number: 4,
        votes_cast: 57,
        surplus_votes: {
          integer: 57,
          numerator: 0,
          denominator: 15,
        },
        meets_surplus_threshold: false,
        next_votes_per_seat: {
          integer: 57,
          numerator: 0,
          denominator: 1,
        },
        whole_seats: 0,
        residual_seats: 0,
      },
      {
        pg_number: 5,
        votes_cast: 56,
        surplus_votes: {
          integer: 56,
          numerator: 0,
          denominator: 15,
        },
        meets_surplus_threshold: false,
        next_votes_per_seat: {
          integer: 56,
          numerator: 0,
          denominator: 1,
        },
        whole_seats: 0,
        residual_seats: 0,
      },
      {
        pg_number: 6,
        votes_cast: 55,
        surplus_votes: {
          integer: 55,
          numerator: 0,
          denominator: 15,
        },
        meets_surplus_threshold: false,
        next_votes_per_seat: {
          integer: 55,
          numerator: 0,
          denominator: 1,
        },
        whole_seats: 0,
        residual_seats: 0,
      },
      {
        pg_number: 7,
        votes_cast: 54,
        surplus_votes: {
          integer: 54,
          numerator: 0,
          denominator: 15,
        },
        meets_surplus_threshold: false,
        next_votes_per_seat: {
          integer: 54,
          numerator: 0,
          denominator: 1,
        },
        whole_seats: 0,
        residual_seats: 0,
      },
      {
        pg_number: 8,
        votes_cast: 52,
        surplus_votes: {
          integer: 52,
          numerator: 0,
          denominator: 15,
        },
        meets_surplus_threshold: false,
        next_votes_per_seat: {
          integer: 52,
          numerator: 0,
          denominator: 1,
        },
        whole_seats: 0,
        residual_seats: 0,
      },
    ],
  },
  {
    residual_seat_number: 4,
    change: {
      assigned_by: "HighestAverage",
      selected_pg_number: 3,
      pg_options: [3],
      pg_assigned: [3],
      votes_per_seat: {
        integer: 58,
        numerator: 0,
        denominator: 1,
      },
    },
    standing: [
      {
        pg_number: 1,
        votes_cast: 808,
        surplus_votes: {
          integer: 8,
          numerator: 0,
          denominator: 15,
        },
        meets_surplus_threshold: true,
        next_votes_per_seat: {
          integer: 62,
          numerator: 2,
          denominator: 13,
        },
        whole_seats: 10,
        residual_seats: 2,
      },
      {
        pg_number: 2,
        votes_cast: 60,
        surplus_votes: {
          integer: 60,
          numerator: 0,
          denominator: 15,
        },
        meets_surplus_threshold: true,
        next_votes_per_seat: {
          integer: 30,
          numerator: 0,
          denominator: 2,
        },
        whole_seats: 0,
        residual_seats: 1,
      },
      {
        pg_number: 3,
        votes_cast: 58,
        surplus_votes: {
          integer: 58,
          numerator: 0,
          denominator: 15,
        },
        meets_surplus_threshold: false,
        next_votes_per_seat: {
          integer: 58,
          numerator: 0,
          denominator: 1,
        },
        whole_seats: 0,
        residual_seats: 0,
      },
      {
        pg_number: 4,
        votes_cast: 57,
        surplus_votes: {
          integer: 57,
          numerator: 0,
          denominator: 15,
        },
        meets_surplus_threshold: false,
        next_votes_per_seat: {
          integer: 57,
          numerator: 0,
          denominator: 1,
        },
        whole_seats: 0,
        residual_seats: 0,
      },
      {
        pg_number: 5,
        votes_cast: 56,
        surplus_votes: {
          integer: 56,
          numerator: 0,
          denominator: 15,
        },
        meets_surplus_threshold: false,
        next_votes_per_seat: {
          integer: 56,
          numerator: 0,
          denominator: 1,
        },
        whole_seats: 0,
        residual_seats: 0,
      },
      {
        pg_number: 6,
        votes_cast: 55,
        surplus_votes: {
          integer: 55,
          numerator: 0,
          denominator: 15,
        },
        meets_surplus_threshold: false,
        next_votes_per_seat: {
          integer: 55,
          numerator: 0,
          denominator: 1,
        },
        whole_seats: 0,
        residual_seats: 0,
      },
      {
        pg_number: 7,
        votes_cast: 54,
        surplus_votes: {
          integer: 54,
          numerator: 0,
          denominator: 15,
        },
        meets_surplus_threshold: false,
        next_votes_per_seat: {
          integer: 54,
          numerator: 0,
          denominator: 1,
        },
        whole_seats: 0,
        residual_seats: 0,
      },
      {
        pg_number: 8,
        votes_cast: 52,
        surplus_votes: {
          integer: 52,
          numerator: 0,
          denominator: 15,
        },
        meets_surplus_threshold: false,
        next_votes_per_seat: {
          integer: 52,
          numerator: 0,
          denominator: 1,
        },
        whole_seats: 0,
        residual_seats: 0,
      },
    ],
  },
  {
    residual_seat_number: 5,
    change: {
      assigned_by: "HighestAverage",
      selected_pg_number: 4,
      pg_options: [4],
      pg_assigned: [4],
      votes_per_seat: {
        integer: 57,
        numerator: 0,
        denominator: 1,
      },
    },
    standing: [
      {
        pg_number: 1,
        votes_cast: 808,
        surplus_votes: {
          integer: 8,
          numerator: 0,
          denominator: 15,
        },
        meets_surplus_threshold: true,
        next_votes_per_seat: {
          integer: 62,
          numerator: 2,
          denominator: 13,
        },
        whole_seats: 10,
        residual_seats: 2,
      },
      {
        pg_number: 2,
        votes_cast: 60,
        surplus_votes: {
          integer: 60,
          numerator: 0,
          denominator: 15,
        },
        meets_surplus_threshold: true,
        next_votes_per_seat: {
          integer: 30,
          numerator: 0,
          denominator: 2,
        },
        whole_seats: 0,
        residual_seats: 1,
      },
      {
        pg_number: 3,
        votes_cast: 58,
        surplus_votes: {
          integer: 58,
          numerator: 0,
          denominator: 15,
        },
        meets_surplus_threshold: false,
        next_votes_per_seat: {
          integer: 29,
          numerator: 0,
          denominator: 2,
        },
        whole_seats: 0,
        residual_seats: 1,
      },
      {
        pg_number: 4,
        votes_cast: 57,
        surplus_votes: {
          integer: 57,
          numerator: 0,
          denominator: 15,
        },
        meets_surplus_threshold: false,
        next_votes_per_seat: {
          integer: 57,
          numerator: 0,
          denominator: 1,
        },
        whole_seats: 0,
        residual_seats: 0,
      },
      {
        pg_number: 5,
        votes_cast: 56,
        surplus_votes: {
          integer: 56,
          numerator: 0,
          denominator: 15,
        },
        meets_surplus_threshold: false,
        next_votes_per_seat: {
          integer: 56,
          numerator: 0,
          denominator: 1,
        },
        whole_seats: 0,
        residual_seats: 0,
      },
      {
        pg_number: 6,
        votes_cast: 55,
        surplus_votes: {
          integer: 55,
          numerator: 0,
          denominator: 15,
        },
        meets_surplus_threshold: false,
        next_votes_per_seat: {
          integer: 55,
          numerator: 0,
          denominator: 1,
        },
        whole_seats: 0,
        residual_seats: 0,
      },
      {
        pg_number: 7,
        votes_cast: 54,
        surplus_votes: {
          integer: 54,
          numerator: 0,
          denominator: 15,
        },
        meets_surplus_threshold: false,
        next_votes_per_seat: {
          integer: 54,
          numerator: 0,
          denominator: 1,
        },
        whole_seats: 0,
        residual_seats: 0,
      },
      {
        pg_number: 8,
        votes_cast: 52,
        surplus_votes: {
          integer: 52,
          numerator: 0,
          denominator: 15,
        },
        meets_surplus_threshold: false,
        next_votes_per_seat: {
          integer: 52,
          numerator: 0,
          denominator: 1,
        },
        whole_seats: 0,
        residual_seats: 0,
      },
    ],
  },
];

export const apportionment: ApportionmentResult = {
  seats: 15,
  whole_seats: 10,
  residual_seats: 5,
  quota: {
    integer: 80,
    numerator: 0,
    denominator: 15,
  },
  steps: highest_surplus_steps.concat(highest_average_steps),
  final_standing: [
    {
      pg_number: 1,
      votes_cast: 808,
      surplus_votes: {
        integer: 8,
        numerator: 0,
        denominator: 15,
      },
      meets_surplus_threshold: true,
      whole_seats: 10,
      residual_seats: 2,
      total_seats: 12,
    },
    {
      pg_number: 2,
      votes_cast: 60,
      surplus_votes: {
        integer: 60,
        numerator: 0,
        denominator: 15,
      },
      meets_surplus_threshold: true,
      whole_seats: 0,
      residual_seats: 1,
      total_seats: 1,
    },
    {
      pg_number: 3,
      votes_cast: 58,
      surplus_votes: {
        integer: 58,
        numerator: 0,
        denominator: 15,
      },
      meets_surplus_threshold: false,
      whole_seats: 0,
      residual_seats: 1,
      total_seats: 1,
    },
    {
      pg_number: 4,
      votes_cast: 57,
      surplus_votes: {
        integer: 57,
        numerator: 0,
        denominator: 15,
      },
      meets_surplus_threshold: false,
      whole_seats: 0,
      residual_seats: 1,
      total_seats: 1,
    },
    {
      pg_number: 5,
      votes_cast: 56,
      surplus_votes: {
        integer: 56,
        numerator: 0,
        denominator: 15,
      },
      meets_surplus_threshold: false,
      whole_seats: 0,
      residual_seats: 0,
      total_seats: 0,
    },
    {
      pg_number: 6,
      votes_cast: 55,
      surplus_votes: {
        integer: 55,
        numerator: 0,
        denominator: 15,
      },
      meets_surplus_threshold: false,
      whole_seats: 0,
      residual_seats: 0,
      total_seats: 0,
    },
    {
      pg_number: 7,
      votes_cast: 54,
      surplus_votes: {
        integer: 54,
        numerator: 0,
        denominator: 15,
      },
      meets_surplus_threshold: false,
      whole_seats: 0,
      residual_seats: 0,
      total_seats: 0,
    },
    {
      pg_number: 8,
      votes_cast: 52,
      surplus_votes: {
        integer: 52,
        numerator: 0,
        denominator: 15,
      },
      meets_surplus_threshold: false,
      whole_seats: 0,
      residual_seats: 0,
      total_seats: 0,
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
      total: 808,
      candidate_votes: [
        {
          number: 1,
          votes: 404,
        },
        {
          number: 2,
          votes: 404,
        },
      ],
    },
    {
      number: 2,
      total: 60,
      candidate_votes: [
        {
          number: 1,
          votes: 31,
        },
        {
          number: 2,
          votes: 29,
        },
      ],
    },
    {
      number: 3,
      total: 58,
      candidate_votes: [
        {
          number: 1,
          votes: 30,
        },
        {
          number: 2,
          votes: 28,
        },
      ],
    },
    {
      number: 4,
      total: 57,
      candidate_votes: [
        {
          number: 1,
          votes: 30,
        },
        {
          number: 2,
          votes: 27,
        },
      ],
    },
    {
      number: 5,
      total: 56,
      candidate_votes: [
        {
          number: 1,
          votes: 30,
        },
        {
          number: 2,
          votes: 26,
        },
      ],
    },
    {
      number: 6,
      total: 55,
      candidate_votes: [
        {
          number: 1,
          votes: 30,
        },
        {
          number: 2,
          votes: 25,
        },
      ],
    },
    {
      number: 7,
      total: 54,
      candidate_votes: [
        {
          number: 1,
          votes: 30,
        },
        {
          number: 2,
          votes: 24,
        },
      ],
    },
    {
      number: 8,
      total: 52,
      candidate_votes: [
        {
          number: 1,
          votes: 30,
        },
        {
          number: 2,
          votes: 22,
        },
      ],
    },
  ],
};

export const election: Election = {
  id: 2,
  name: "Test Election < 19 seats",
  location: "Test Location",
  number_of_voters: 2000,
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
    {
      number: 6,
      name: "Political Group F",
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
      number: 7,
      name: "Political Group G",
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
      number: 8,
      name: "Political Group H",
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
