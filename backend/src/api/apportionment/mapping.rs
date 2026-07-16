use std::collections::HashMap;

use icu_collator::{Collator, options::CollatorOptions};
use icu_locale_core::locale;

use crate::domain::{
    apportionment::{
        CandidateNomination, ChosenCandidate, DisplayFraction, ListCandidateNomination,
        ListSeatAssignment, PreferenceThreshold, SeatAssignment,
    },
    election::{Candidate, CandidateNumber, PGNumber, PoliticalGroup},
    results::political_group_candidate_votes::PoliticalGroupCandidateVotes,
};

pub fn map_seat_assignment(sa: &apportionment::SeatAssignmentDetails<PGNumber>) -> SeatAssignment {
    SeatAssignment {
        seats: sa.seats,
        full_seats: sa.full_seats,
        residual_seats: sa.residual_seats,
        quota: DisplayFraction::from(sa.quota),
        steps: sa.steps.iter().map(Into::into).collect(),
        standings: sa
            .standings
            .iter()
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

/// Sorts candidates alphabetically by last name, then by initials
/// Uses collation to handle diacritics
fn sort_candidates_alphabetically(mut candidates: Vec<ChosenCandidate>) -> Vec<ChosenCandidate> {
    let collator = Collator::try_new(locale!("nl").into(), CollatorOptions::default())
        .expect("collator data should be available");
    candidates.sort_by(|a, b| {
        collator
            .compare(&a.last_name, &b.last_name)
            .then_with(|| collator.compare(&a.initials, &b.initials))
    });
    candidates
}

pub fn map_candidate_nomination(
    cn: &apportionment::CandidateNominationDetails<'_, PoliticalGroupCandidateVotes>,
    political_groups: &[PoliticalGroup],
) -> CandidateNomination {
    let mut list_names: HashMap<PGNumber, String> = HashMap::new();
    let mut candidate_map: HashMap<(PGNumber, CandidateNumber), Candidate> = HashMap::new();
    for list in political_groups {
        for candidate in &list.candidates {
            candidate_map.insert((list.number, candidate.number), candidate.clone());
        }
        list_names.insert(list.number, list.name.clone());
    }

    let mut chosen_candidates: Vec<ChosenCandidate> = cn
        .chosen_candidates
        .iter()
        .map(|c| {
            ChosenCandidate::new(
                candidate_map[&(c.list_number, c.candidate_number)].clone(),
                c.list_number,
                list_names
                    .get(&c.list_number)
                    .expect("list name should exist")
                    .clone(),
            )
        })
        .collect();
    chosen_candidates = sort_candidates_alphabetically(chosen_candidates);

    let list_candidate_nomination = cn
        .list_candidate_nomination
        .iter()
        .map(|lcn| ListCandidateNomination {
            list_number: lcn.list_number,
            list_name: list_names
                .remove(&lcn.list_number)
                .expect("list must exist in election data"),
            list_seats: lcn.list_seats,
            preferential_candidate_nomination: lcn
                .preferential_candidate_nomination
                .iter()
                .map(|&&cv| cv)
                .collect(),
            other_candidate_nomination: lcn
                .other_candidate_nomination
                .iter()
                .map(|&&cv| cv)
                .collect(),
            updated_candidate_ranking: lcn
                .candidate_ranking
                .iter_updated()
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
    use super::DisplayFraction;

    #[test]
    fn test_display_fraction() {
        let fraction = apportionment::Fraction::new(11, 5);
        let display_fraction = DisplayFraction::from(fraction);
        assert_eq!(display_fraction.integer, 2);
        assert_eq!(display_fraction.numerator, 1);
        assert_eq!(display_fraction.denominator, 5);
    }

    mod sort_candidates_alphabetically {
        use crate::{
            api::apportionment::mapping::sort_candidates_alphabetically,
            domain::{
                apportionment::ChosenCandidate,
                election::{CandidateNumber, PGNumber},
            },
        };

        fn create_candidates(names: &[(&str, Option<&str>, &str)]) -> Vec<ChosenCandidate> {
            names
                .iter()
                .enumerate()
                .map(|(i, &(initials, first_name, last_name))| ChosenCandidate {
                    number: CandidateNumber::from(u32::try_from(i).unwrap() + 1),
                    initials: initials.to_string(),
                    first_name: first_name.map(String::from),
                    last_name_prefix: None,
                    last_name: last_name.to_string(),
                    locality: String::new(),
                    country_code: None,
                    gender: None,
                    list_number: PGNumber::from(1),
                    list_name: String::new(),
                })
                .collect()
        }

        #[test]
        fn test_last_name_then_initials() {
            let candidates = create_candidates(&[
                ("A.", Some("Pieter"), "Duin"),
                ("M.", Some("Zainab"), "Appel"),
                ("M.", Some("Yana"), "Zee"),
                ("A.", Some("Ruben"), "Zee"),
                ("N.", Some("Anna"), "Zee"),
                ("D.", None, "Zee"),
                ("D.J.E", Some("Sofia"), "Korte"),
                ("N.B.", Some("Tessa"), "Groen"),
                ("N.", Some("Willem"), "Groen"),
                ("N.A.", Some("Vera"), "Groen"),
            ]);
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

        #[test]
        fn test_diacritics() {
            let candidates = create_candidates(&[
                ("A.", None, "Zee"),
                ("N.", None, "Müller"),
                ("B.", None, "Ćelik"),
                ("P.", None, "Groen"),
                ("C.", None, "Éland"),
                ("O.", None, "Šimić"),
                ("H.", None, "Ñuñez"),
                ("D.", None, "Öztürk"),
                ("Ö.", None, "Groen"),
                ("R.", None, "Ådal"),
                ("E.", None, "Ekker"),
                ("I.", None, "boer"),
                ("I.", None, "Boenen"),
                ("F.", None, "Aalst"),
                ("j.", None, "groot"),
                ("L.", None, "Mulder"),
                ("G.", None, "Ünal"),
            ]);
            let sorted_candidates = sort_candidates_alphabetically(candidates);

            let sorted_names: Vec<(&str, &str)> = sorted_candidates
                .iter()
                .map(|c| (c.initials.as_str(), c.last_name.as_str()))
                .collect();
            assert_eq!(
                sorted_names,
                vec![
                    ("F.", "Aalst"),
                    ("R.", "Ådal"),
                    ("I.", "Boenen"),
                    ("I.", "boer"),
                    ("B.", "Ćelik"),
                    ("E.", "Ekker"),
                    ("C.", "Éland"),
                    ("Ö.", "Groen"),
                    ("P.", "Groen"),
                    ("j.", "groot"),
                    ("L.", "Mulder"),
                    ("N.", "Müller"),
                    ("H.", "Ñuñez"),
                    ("D.", "Öztürk"),
                    ("O.", "Šimić"),
                    ("G.", "Ünal"),
                    ("A.", "Zee"),
                ]
            );
        }

        #[test]
        fn test_case() {
            // lowercase comes first
            let candidates = create_candidates(&[
                ("J.", None, "Groen"),
                ("B.", None, "Boer"),
                ("B.", None, "Boen"),
                ("j.", None, "Groen"),
                ("I.", None, "boer"),
            ]);
            let sorted_candidates = sort_candidates_alphabetically(candidates);

            let sorted_names: Vec<(&str, &str)> = sorted_candidates
                .iter()
                .map(|c| (c.initials.as_str(), c.last_name.as_str()))
                .collect();
            assert_eq!(
                sorted_names,
                vec![
                    ("B.", "Boen"),
                    ("I.", "boer"),
                    ("B.", "Boer"),
                    ("j.", "Groen"),
                    ("J.", "Groen"),
                ]
            );
        }
    }
}
