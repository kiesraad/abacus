import {
  CandidateNominationResult,
  CommitteeSession,
  ElectionSummary,
  ElectionWithPoliticalGroups,
  SeatAssignmentResult,
} from "@/types/generated/openapi";

export const seat_assignment: SeatAssignmentResult = {
  seats: 15,
  full_seats: 10,
  residual_seats: 5,
  quota: {
    integer: 340,
    numerator: 4,
    denominator: 15,
  },
  steps: [
    {
      residual_seat_number: 1,
      change: {
        changed_by: "LargestRemainderAssignment",
        selected_pg_number: 2,
        pg_options: [2],
        pg_assigned: [2],
        remainder_votes: {
          integer: 296,
          numerator: 7,
          denominator: 15,
        },
      },
      standings: [
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
        changed_by: "LargestRemainderAssignment",
        selected_pg_number: 3,
        pg_options: [3],
        pg_assigned: [3],
        remainder_votes: {
          integer: 226,
          numerator: 11,
          denominator: 15,
        },
      },
      standings: [
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
        changed_by: "LargestRemainderAssignment",
        selected_pg_number: 4,
        pg_options: [4],
        pg_assigned: [4],
        remainder_votes: {
          integer: 195,
          numerator: 11,
          denominator: 15,
        },
      },
      standings: [
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
      change: {
        changed_by: "AbsoluteMajorityReassignment",
        pg_retracted_seat: 4,
        pg_assigned_seat: 1,
      },
      standings: [
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
          residual_seats: 1,
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
            integer: 178,
            numerator: 2,
            denominator: 3,
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
      change: {
        changed_by: "ListExhaustionRemoval",
        pg_retracted_seat: 1,
        full_seat: false,
      },
      standings: [
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
            integer: 178,
            numerator: 2,
            denominator: 3,
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
      change: {
        changed_by: "ListExhaustionRemoval",
        pg_retracted_seat: 1,
        full_seat: true,
      },
      standings: [
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
          full_seats: 6,
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
            integer: 178,
            numerator: 2,
            denominator: 3,
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
      change: {
        changed_by: "ListExhaustionRemoval",
        pg_retracted_seat: 1,
        full_seat: true,
      },
      standings: [
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
          full_seats: 5,
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
            integer: 178,
            numerator: 2,
            denominator: 3,
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
      residual_seat_number: 4,
      change: {
        changed_by: "LargestRemainderAssignment",
        selected_pg_number: 4,
        pg_options: [4],
        pg_assigned: [4],
        remainder_votes: {
          integer: 195,
          numerator: 11,
          denominator: 15,
        },
      },
      standings: [
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
          full_seats: 5,
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
            integer: 178,
            numerator: 2,
            denominator: 3,
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
      residual_seat_number: 5,
      change: {
        changed_by: "LargestRemainderAssignment",
        selected_pg_number: 5,
        pg_options: [5],
        pg_assigned: [5],
        remainder_votes: {
          integer: 112,
          numerator: 11,
          denominator: 15,
        },
      },
      standings: [
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
          full_seats: 5,
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
            integer: 178,
            numerator: 2,
            denominator: 3,
          },
          full_seats: 1,
          residual_seats: 1,
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
      residual_seat_number: 6,
      change: {
        changed_by: "UniqueHighestAverageAssignment",
        selected_pg_number: 2,
        pg_options: [2],
        pg_assigned: [2],
        pg_exhausted: [1, 3, 4, 5],
        votes_per_seat: {
          integer: 244,
          numerator: 1,
          denominator: 4,
        },
      },
      standings: [
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
          full_seats: 5,
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
            integer: 178,
            numerator: 2,
            denominator: 3,
          },
          full_seats: 1,
          residual_seats: 1,
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
            integer: 151,
            numerator: 0,
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
      votes_cast: 2571,
      remainder_votes: {
        integer: 189,
        numerator: 2,
        denominator: 15,
      },
      meets_remainder_threshold: true,
      full_seats: 5,
      residual_seats: 0,
      total_seats: 5,
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
      residual_seats: 2,
      total_seats: 4,
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
      residual_seats: 1,
      total_seats: 2,
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
      residual_seats: 1,
      total_seats: 2,
    },
  ],
};

export const candidate_nomination: CandidateNominationResult = {
  preference_threshold: {
    percentage: 50,
    number_of_votes: {
      integer: 170,
      numerator: 200,
      denominator: 1500,
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
    },
    {
      number: 2,
      initials: "T.J.",
      first_name: "Tedje Johannes",
      last_name_prefix: "van",
      last_name: "Es",
      locality: "Test Location",
      gender: "Male",
    },
    {
      number: 1,
      initials: "T.",
      first_name: "Tjolk",
      last_name: "Hekking",
      locality: "Test Location",
      gender: "Male",
    },
    {
      number: 2,
      initials: "H.",
      first_name: "Henny",
      last_name: "Hekking",
      locality: "Test Location",
      gender: "Female",
    },
    {
      number: 1,
      initials: "F.",
      first_name: "Frederik",
      last_name: "Jacobse",
      locality: "Test Location",
      gender: "Male",
    },
    {
      number: 4,
      initials: "A.",
      first_name: "Arie",
      last_name: "Jansen",
      locality: "Test Location",
      gender: "X",
    },
    {
      number: 4,
      initials: "K.",
      first_name: "Klaas",
      last_name: "Kloosterboer",
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
    {
      number: 3,
      initials: "M.",
      first_name: "Marijke",
      last_name: "Oud",
      locality: "Test Location",
      gender: "Female",
    },
    {
      number: 2,
      initials: "D.",
      last_name: "Po",
      locality: "Test Location",
      gender: "X",
    },
    {
      number: 1,
      initials: "G.",
      first_name: "Gert",
      last_name: "Smit",
      locality: "Test Location",
      gender: "Male",
    },
    {
      number: 3,
      initials: "W.",
      first_name: "Willem",
      last_name_prefix: "de",
      last_name: "Vries",
      locality: "Test Location",
      gender: "Male",
    },
    {
      number: 5,
      initials: "H.",
      first_name: "Henk",
      last_name_prefix: "van der",
      last_name: "Weijden",
      locality: "Test Location",
      gender: "Male",
    },
  ],
  political_group_candidate_nomination: [
    {
      pg_number: 1,
      pg_name: "Political Group A",
      pg_seats: 5,
      preferential_candidate_nomination: [
        {
          number: 1,
          votes: 1069,
        },
        {
          number: 3,
          votes: 421,
        },
        {
          number: 2,
          votes: 403,
        },
        {
          number: 5,
          votes: 368,
        },
        {
          number: 4,
          votes: 310,
        },
      ],
      other_candidate_nomination: [],
      updated_candidate_ranking: [
        {
          number: 1,
          initials: "L.",
          first_name: "Lidewij",
          last_name: "Oud",
          locality: "Test Location",
          gender: "Female",
        },
        {
          number: 3,
          initials: "M.",
          first_name: "Marijke",
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
        {
          number: 5,
          initials: "H.",
          first_name: "Henk",
          last_name_prefix: "van der",
          last_name: "Weijden",
          locality: "Test Location",
          gender: "Male",
        },
        {
          number: 4,
          initials: "A.",
          first_name: "Arie",
          last_name: "Jansen",
          locality: "Test Location",
          gender: "X",
        },
      ],
    },
    {
      pg_number: 2,
      pg_name: "Political Group B",
      pg_seats: 4,
      preferential_candidate_nomination: [
        {
          number: 1,
          votes: 552,
        },
        {
          number: 3,
          votes: 181,
        },
        {
          number: 4,
          votes: 176,
        },
      ],
      other_candidate_nomination: [
        {
          number: 2,
          votes: 68,
        },
      ],
      updated_candidate_ranking: [
        {
          number: 1,
          initials: "T.",
          first_name: "Tinus",
          last_name: "Bakker",
          locality: "Test Location",
          gender: "Male",
        },
        {
          number: 3,
          initials: "W.",
          first_name: "Willem",
          last_name_prefix: "de",
          last_name: "Vries",
          locality: "Test Location",
          gender: "Male",
        },
        {
          number: 4,
          initials: "K.",
          first_name: "Klaas",
          last_name: "Kloosterboer",
          locality: "Test Location",
          gender: "Male",
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
      pg_number: 3,
      pg_name: "Political Group C",
      pg_seats: 2,
      preferential_candidate_nomination: [
        {
          number: 1,
          votes: 329,
        },
        {
          number: 2,
          votes: 238,
        },
      ],
      other_candidate_nomination: [],
      updated_candidate_ranking: [],
    },
    {
      pg_number: 4,
      pg_name: "Political Group D",
      pg_seats: 2,
      preferential_candidate_nomination: [
        {
          number: 1,
          votes: 447,
        },
      ],
      other_candidate_nomination: [
        {
          number: 2,
          votes: 89,
        },
      ],
      updated_candidate_ranking: [],
    },
    {
      pg_number: 5,
      pg_name: "Political Group E",
      pg_seats: 2,
      preferential_candidate_nomination: [
        {
          number: 1,
          votes: 266,
        },
        {
          number: 2,
          votes: 187,
        },
      ],
      other_candidate_nomination: [],
      updated_candidate_ranking: [],
    },
  ],
};

export const election_summary: ElectionSummary = {
  voters_counts: {
    poll_card_count: 5104,
    proxy_certificate_count: 1,
    total_admitted_voters_count: 5105,
  },
  votes_counts: {
    votes_candidates_count: 5104,
    blank_votes_count: 0,
    invalid_votes_count: 1,
    total_votes_cast_count: 5105,
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
  political_group_votes: [
    {
      number: 1,
      total: 2571,
      candidate_votes: [
        {
          number: 1,
          votes: 1069,
        },
        {
          number: 2,
          votes: 403,
        },
        {
          number: 3,
          votes: 421,
        },
        {
          number: 4,
          votes: 310,
        },
        {
          number: 5,
          votes: 368,
        },
      ],
    },
    {
      number: 2,
      total: 977,
      candidate_votes: [
        {
          number: 1,
          votes: 552,
        },
        {
          number: 2,
          votes: 68,
        },
        {
          number: 3,
          votes: 181,
        },
        {
          number: 4,
          votes: 176,
        },
      ],
    },
    {
      number: 3,
      total: 567,
      candidate_votes: [
        {
          number: 1,
          votes: 329,
        },
        {
          number: 2,
          votes: 238,
        },
      ],
    },
    {
      number: 4,
      total: 536,
      candidate_votes: [
        {
          number: 1,
          votes: 447,
        },
        {
          number: 2,
          votes: 89,
        },
      ],
    },
    {
      number: 5,
      total: 453,
      candidate_votes: [
        {
          number: 1,
          votes: 266,
        },
        {
          number: 2,
          votes: 187,
        },
      ],
    },
  ],
};

export const committee_session: CommitteeSession = {
  id: 4,
  number: 1,
  election_id: 4,
  status: "data_entry_finished",
  location: "",
  start_date: "",
  start_time: "",
  number_of_voters: 6000,
};

export const election: ElectionWithPoliticalGroups = {
  id: 4,
  name: "Test Election Absolute Majority Change and List Exhaustion",
  counting_method: "CSO",
  election_id: "TestLocation_2026",
  location: "Test Location",
  domain_id: "0000",
  category: "Municipal",
  number_of_seats: 15,
  election_date: "2026-03-18",
  nomination_date: "2026-02-02",
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
        {
          number: 3,
          initials: "M.",
          first_name: "Marijke",
          last_name: "Oud",
          locality: "Test Location",
          gender: "Female",
        },
        {
          number: 4,
          initials: "A.",
          first_name: "Arie",
          last_name: "Jansen",
          locality: "Test Location",
          gender: "X",
        },
        {
          number: 5,
          initials: "H.",
          first_name: "Henk",
          last_name_prefix: "van der",
          last_name: "Weijden",
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
        },
        {
          number: 2,
          initials: "D.",
          last_name: "Po",
          locality: "Test Location",
          gender: "X",
        },
        {
          number: 3,
          initials: "W.",
          first_name: "Willem",
          last_name_prefix: "de",
          last_name: "Vries",
          locality: "Test Location",
          gender: "Male",
        },
        {
          number: 4,
          initials: "K.",
          first_name: "Klaas",
          last_name: "Kloosterboer",
          locality: "Test Location",
          gender: "Male",
        },
      ],
    },
    {
      number: 3,
      name: "Political Group C",
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
    {
      number: 4,
      name: "Political Group D",
      candidates: [
        {
          number: 1,
          initials: "T.",
          first_name: "Tjolk",
          last_name: "Hekking",
          locality: "Test Location",
          gender: "Male",
        },
        {
          number: 2,
          initials: "H.",
          first_name: "Henny",
          last_name: "Hekking",
          locality: "Test Location",
          gender: "Female",
        },
      ],
    },
    {
      number: 5,
      name: "Political Group E",
      candidates: [
        {
          number: 1,
          initials: "F.",
          first_name: "Frederik",
          last_name: "Jacobse",
          locality: "Test Location",
          gender: "Male",
        },
        {
          number: 2,
          initials: "T.J.",
          first_name: "Tedje Johannes",
          last_name_prefix: "van",
          last_name: "Es",
          locality: "Test Location",
          gender: "Male",
        },
      ],
    },
  ],
};
