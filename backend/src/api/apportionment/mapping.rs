use std::collections::HashMap;

use crate::{
    api::apportionment::structs::{
        CandidateNomination, DisplayFraction, ListCandidateNomination, ListSeatAssignment,
        PreferenceThreshold, SeatAssignment,
    },
    domain::{
        data_entry::PoliticalGroupCandidateVotes,
        election::{Candidate, CandidateNumber, PGNumber, PoliticalGroup},
    },
};

pub fn map_seat_assignment(
    sa: apportionment::SeatAssignmentResult<PoliticalGroupCandidateVotes>,
) -> SeatAssignment {
    SeatAssignment {
        seats: sa.seats,
        full_seats: sa.full_seats,
        residual_seats: sa.residual_seats,
        quota: DisplayFraction::from(sa.quota),
        steps: sa.steps.into_iter().map(Into::into).collect(),
        final_standing: sa
            .final_standing
            .into_iter()
            .map(|standing| ListSeatAssignment {
                list_number: standing.list_number,
                votes_cast: standing.votes_cast,
                remainder_votes: DisplayFraction::from(standing.remainder_votes),
                meets_remainder_threshold: standing.meets_remainder_threshold,
                full_seats: standing.full_seats,
                residual_seats: standing.residual_seats,
                total_seats: standing.total_seats,
            })
            .collect(),
    }
}

fn sort_candidates_alphabetically(mut candidates: Vec<Candidate>) -> Vec<Candidate> {
    candidates.sort_by(|a, b| {
        a.last_name
            .cmp(&b.last_name)
            .then_with(|| a.initials.cmp(&b.initials))
    });
    candidates
}

pub fn map_candidate_nomination(
    cn: apportionment::CandidateNominationResult<'_, PoliticalGroupCandidateVotes>,
    political_groups: Vec<PoliticalGroup>,
) -> CandidateNomination {
    let mut list_names: HashMap<PGNumber, String> = HashMap::new();
    let mut candidate_map: HashMap<(PGNumber, CandidateNumber), Candidate> = HashMap::new();
    for list in political_groups {
        for candidate in &list.candidates {
            candidate_map.insert((list.number, candidate.number), candidate.clone());
        }
        list_names.insert(list.number, list.name);
    }

    let mut chosen_candidates: Vec<Candidate> = cn
        .chosen_candidates
        .iter()
        .map(|c| candidate_map[&(c.list_number, c.candidate_number)].clone())
        .collect();
    chosen_candidates = sort_candidates_alphabetically(chosen_candidates);

    let list_candidate_nomination = cn
        .list_candidate_nomination
        .into_iter()
        .map(|lcn| ListCandidateNomination {
            list_number: lcn.list_number,
            list_name: list_names
                .remove(&lcn.list_number)
                .expect("list must exist in election data"),
            list_seats: lcn.list_seats,
            preferential_candidate_nomination: lcn
                .preferential_candidate_nomination
                .into_iter()
                .copied()
                .collect(),
            other_candidate_nomination: lcn
                .other_candidate_nomination
                .into_iter()
                .copied()
                .collect(),
            updated_candidate_ranking: lcn
                .updated_candidate_ranking
                .iter()
                .map(|num| candidate_map[&(lcn.list_number, *num)].clone())
                .collect(),
        })
        .collect();

    let threshold = cn.preference_threshold;
    CandidateNomination {
        preference_threshold: PreferenceThreshold {
            percentage: threshold.percentage,
            number_of_votes: DisplayFraction::from(threshold.number_of_votes),
        },
        chosen_candidates,
        list_candidate_nomination,
    }
}

#[cfg(test)]
mod tests {
    use crate::{
        api::apportionment::mapping::sort_candidates_alphabetically,
        domain::election::{Candidate, CandidateNumber},
    };

    use super::DisplayFraction;

    #[test]
    fn test_display_fraction() {
        let fraction = apportionment::Fraction::new(11, 5);
        let display_fraction = DisplayFraction::from(fraction);
        assert_eq!(display_fraction.integer, 2);
        assert_eq!(display_fraction.numerator, 1);
        assert_eq!(display_fraction.denominator, 5);
    }

    #[test]
    fn test_sort_candidates_alphabetically() {
        // (initials, last name)
        let names: Vec<(&str, &str)> = vec![
            ("A.", "Duin"),
            ("M.", "Appel"),
            ("M.", "Zee"),
            ("A.", "Zee"),
            ("N.", "Zee"),
            ("D.", "Zee"),
            ("D.J.E", "Korte"),
            ("N.B.", "Groen"),
            ("N.", "Groen"),
            ("N.A.", "Groen"),
        ];

        let candidates: Vec<Candidate> = names
            .iter()
            .enumerate()
            .map(|(i, &(initials, last_name))| Candidate {
                number: CandidateNumber::from(u32::try_from(i).unwrap() + 1),
                initials: initials.to_string(),
                first_name: None,
                last_name_prefix: None,
                last_name: last_name.to_string(),
                locality: String::new(),
                country_code: None,
                gender: None,
            })
            .collect();
        let sorted_candidates = sort_candidates_alphabetically(candidates);

        let sorted_names: Vec<(&str, &str)> = sorted_candidates
            .iter()
            .map(|c| (c.initials.as_str(), c.last_name.as_str()))
            .collect();
        assert_eq!(
            sorted_names,
            vec![
                ("M.", "Appel"),
                ("A.", "Duin"),
                ("N.", "Groen"),
                ("N.A.", "Groen"),
                ("N.B.", "Groen"),
                ("D.J.E", "Korte"),
                ("A.", "Zee"),
                ("D.", "Zee"),
                ("M.", "Zee"),
                ("N.", "Zee"),
            ]
        );
    }
}
