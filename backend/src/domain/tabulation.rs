use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use crate::{
    APIError,
    domain::{
        data_entry::{DataEntrySource, DataEntrySourceNumber},
        election::{CommitteeCategory, ElectionWithPoliticalGroups, VoteCountingMethod},
        polling_station::PollingStationForSession,
        results::{
            CommonDifferencesCounts, Results,
            count::Count,
            cso_first_session_results::CSOFirstSessionResults,
            dso_first_session_results::DSOFirstSessionResults,
            political_group_candidate_votes::{CandidateVotes, PoliticalGroupCandidateVotes},
            political_group_total_votes::PoliticalGroupTotalVotes,
            voters_counts::VotersCounts,
            votes_counts::VotesCounts,
        },
        validate::Validate,
    },
    error::ErrorReference,
};

/// Contains the totals of the election results, added up from the votes of all polling stations.
#[derive(Serialize, Deserialize, Debug, ToSchema, Clone, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct ElectionTotals {
    /// The total number of voters
    pub voters_counts: VotersCounts,
    /// The total number of votes
    pub votes_counts: VotesCounts,
    /// The differences between voters and votes
    pub differences_counts: DifferencesTotals,
    /// The total votes for each political group (and each candidate within)
    pub political_group_votes: Vec<PoliticalGroupCandidateVotes>,
    /// Totals specific to the committee (GSB or CSB) of the election
    pub committee_specific: CommitteeSpecificTotals,
}

impl ElectionTotals {
    /// Initialize new totals with all counts set to zero.
    pub fn zero(election: &ElectionWithPoliticalGroups) -> ElectionTotals {
        ElectionTotals {
            voters_counts: VotersCounts {
                poll_card_count: 0,
                proxy_certificate_count: 0,
                voter_card_count: (!election.category.is_local_election()).then_some(0),
                total_admitted_voters_count: 0,
            },
            votes_counts: VotesCounts {
                political_group_total_votes: vec![],
                total_votes_candidates_count: 0,
                blank_votes_count: 0,
                invalid_votes_count: 0,
                total_votes_cast_count: 0,
            },
            differences_counts: DifferencesTotals::zero(),
            political_group_votes: vec![],
            committee_specific: CommitteeSpecificTotals::zero(election),
        }
    }

    fn process_results(
        election: &ElectionWithPoliticalGroups,
        results: &[(DataEntrySource, Results)],
        totals: &mut ElectionTotals,
    ) -> Result<ElectionTotals, APIError> {
        // list of polling stations for which we processed results
        let mut touched_data_sources: Vec<DataEntrySourceNumber> = vec![];

        // loop over results and add them to the running total
        for (data_source, result) in results {
            // Check that we didn't previously touch this polling station
            if touched_data_sources.contains(&data_source.number()) {
                return Err(APIError::AddError(
                    format!("Data entry source {} is repeated", data_source.number()),
                    ErrorReference::PollingStationRepeated,
                ));
            }

            // validate result and make sure that there are no errors
            let validation_results = result.validate(election, &"data".into())?;
            if validation_results.has_errors() {
                return Err(APIError::AddError(
                    format!(
                        "Data entry source {} has validation errors: {:?}",
                        data_source.number(),
                        validation_results
                    ),
                    ErrorReference::PollingStationValidationErrors,
                ));
            }

            // add voters and votes to the total
            totals.voters_counts += result.voters_counts();
            totals.votes_counts.add(result.votes_counts())?;

            // add any differences noted to the total
            totals
                .differences_counts
                .add_results(data_source, &result.differences_counts());

            // add votes for each political group to the total
            for pg in result.political_group_votes() {
                let pg_total = totals
                    .political_group_votes
                    .iter_mut()
                    .find(|pgv| pgv.number == pg.number)
                    .ok_or(APIError::AddError(
                        format!("Could not find political group '{}'", pg.number),
                        ErrorReference::InvalidPoliticalGroup,
                    ))?;
                pg_total.add(pg)?;
            }

            // add the result data that is specific to the committee (GSB, CSB)
            totals.committee_specific.add_result(data_source, result)?;

            touched_data_sources.push(data_source.number());
        }

        Ok(totals.clone())
    }

    /// Add all the votes from the given polling stations together, using the
    /// data from the election for candidates and political groups.
    pub fn tabulate(
        election: &ElectionWithPoliticalGroups,
        results: &[(DataEntrySource, Results)],
    ) -> Result<ElectionTotals, APIError> {
        // running totals
        let mut totals = ElectionTotals::zero(election);

        // initialize political group votes to zero
        for group in &election.political_groups {
            totals
                .votes_counts
                .political_group_total_votes
                .push(PoliticalGroupTotalVotes {
                    number: group.number,
                    total: 0,
                });

            totals
                .political_group_votes
                .push(PoliticalGroupCandidateVotes {
                    number: group.number,
                    total: 0,
                    candidate_votes: group
                        .candidates
                        .iter()
                        .map(|c| CandidateVotes {
                            number: c.number,
                            votes: 0,
                        })
                        .collect(),
                });
        }

        totals = Self::process_results(election, results, &mut totals)?;

        Ok(totals)
    }

    /// The CSO polling station investigations of these totals,
    /// or an error if these are not CSO totals.
    pub fn cso_investigations(&self) -> Result<&CSOInvestigations, APIError> {
        let CommitteeSpecificTotals::GSB(GSBTotals::CSO(investigations)) = &self.committee_specific
        else {
            return Err(APIError::DataIntegrityError(
                "CSO investigations are only available for CSO totals".to_string(),
            ));
        };

        Ok(investigations)
    }

    /// The DSO polling station investigations of these totals,
    /// or an error if these are not DSO totals.
    pub fn dso_investigations(&self) -> Result<&DSOInvestigations, APIError> {
        let CommitteeSpecificTotals::GSB(GSBTotals::DSO(investigations)) = &self.committee_specific
        else {
            return Err(APIError::DataIntegrityError(
                "DSO investigations are only available for DSO totals".to_string(),
            ));
        };

        Ok(investigations)
    }
}

/// Extract the polling station from a data entry source,
/// returning an error for other kinds of data entry sources.
fn polling_station_source(
    data_source: &DataEntrySource,
) -> Result<&PollingStationForSession, APIError> {
    let DataEntrySource::PollingStation(polling_station_source) = data_source else {
        return Err(APIError::AddError(
            format!(
                "Expected polling station data entry source, got {:?}",
                data_source
            ),
            ErrorReference::InvalidDataEntrySource,
        ));
    };

    Ok(polling_station_source)
}

/// Committee specific totals, i.e. specific for GSB or CSB.
#[derive(Serialize, Deserialize, Debug, Clone, ToSchema, PartialEq)]
#[serde(tag = "committee")]
pub enum CommitteeSpecificTotals {
    /// Totals specific to a municipal electoral committee (gemeentelijk stembureau, GSB)
    GSB(GSBTotals),
    /// Totals specific to a central electoral committee (centraal stembureau, CSB)
    CSB {
        /// The number of voters ("Kiesgerechtigden")
        number_of_voters: u32,
    },
}

impl CommitteeSpecificTotals {
    /// Initialize new committee specific totals for the committee and vote
    /// counting method of the given election.
    pub fn zero(election: &ElectionWithPoliticalGroups) -> CommitteeSpecificTotals {
        match election.committee_category {
            CommitteeCategory::GSB => match election.counting_method {
                Some(VoteCountingMethod::CSO) => {
                    CommitteeSpecificTotals::GSB(GSBTotals::CSO(CSOInvestigations::default()))
                }
                Some(VoteCountingMethod::DSO) => {
                    CommitteeSpecificTotals::GSB(GSBTotals::DSO(DSOInvestigations::default()))
                }
                None => panic!("Invalid election"),
            },
            CommitteeCategory::CSB => CommitteeSpecificTotals::CSB {
                number_of_voters: 0,
            },
        }
    }

    /// Add the result data that is specific to the committee (GSB or CSB).
    fn add_result(
        &mut self,
        data_source: &DataEntrySource,
        result: &Results,
    ) -> Result<(), APIError> {
        match (self, result) {
            // for the first session results, we need to add investigation status information to the totals
            (
                CommitteeSpecificTotals::GSB(GSBTotals::CSO(investigations)),
                Results::CSOFirstSession(cso_first_result),
            ) => {
                investigations
                    .append_result(polling_station_source(data_source)?, cso_first_result);
            }
            (
                CommitteeSpecificTotals::GSB(GSBTotals::DSO(investigations)),
                Results::DSOFirstSession(dso_first_result),
            ) => {
                investigations
                    .append_result(polling_station_source(data_source)?, dso_first_result);
            }
            // next session results contain no investigation status information
            (CommitteeSpecificTotals::GSB(GSBTotals::CSO(_)), Results::CSONextSession(_))
            | (CommitteeSpecificTotals::GSB(GSBTotals::DSO(_)), Results::DSONextSession(_)) => {}
            // GSB results contain number of voters which need to be added
            (CommitteeSpecificTotals::CSB { number_of_voters }, Results::GSB(gsb_result)) => {
                *number_of_voters += gsb_result.number_of_voters;
            }
            // any other combination means the result model does not match the election
            _ => {
                return Err(APIError::AddError(
                    format!(
                        "Result model of data entry source {} does not match the election",
                        data_source.number()
                    ),
                    ErrorReference::InvalidData,
                ));
            }
        }

        Ok(())
    }
}

/// GSB specific totals, depending on the vote counting method (CSO or DSO).
#[derive(Serialize, Deserialize, Debug, Clone, ToSchema, PartialEq)]
#[serde(tag = "counting_method")]
pub enum GSBTotals {
    /// Totals specific to centrally counted (centrale stemopneming, CSO) results
    CSO(CSOInvestigations),
    /// Totals specific to decentrally counted (decentrale stemopneming, DSO) results
    DSO(DSOInvestigations),
}

/// Contains the totals of the differences, containing which polling stations had differences.
#[derive(Debug, Serialize, Deserialize, Clone, ToSchema, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct DifferencesTotals {
    pub more_ballots_count: SumCount,
    pub fewer_ballots_count: SumCount,
}

impl DifferencesTotals {
    /// Initialize a new differences count with all counts set to zero.
    pub fn zero() -> DifferencesTotals {
        DifferencesTotals {
            more_ballots_count: SumCount::zero(),
            fewer_ballots_count: SumCount::zero(),
        }
    }

    /// Add the differences for a specific polling station to the total.
    pub fn add_results(
        &mut self,
        data_source: &DataEntrySource,
        differences_counts: &CommonDifferencesCounts,
    ) {
        self.more_ballots_count
            .add(data_source, *differences_counts.more_ballots_count);
        self.fewer_ballots_count
            .add(data_source, *differences_counts.fewer_ballots_count);
    }
}

/// Contains a sum count, containing both the count and a list of polling
/// stations that contributed to it.
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct SumCount {
    #[schema(value_type = u32)]
    pub count: Count,
    pub data_entry_sources: Vec<DataEntrySourceNumber>,
}

impl SumCount {
    /// Initialize a count of zero.
    pub fn zero() -> SumCount {
        SumCount {
            count: 0,
            data_entry_sources: vec![],
        }
    }

    /// Add the count for a specific polling station to this sum count.
    pub fn add(&mut self, data_source: &DataEntrySource, count: Count) {
        if count > 0 {
            self.count += count;
            self.data_entry_sources.push(data_source.number());
        }
    }
}

/// Polling stations where results were investigated by the GSB,
/// as vectors of polling station numbers
#[derive(Serialize, Deserialize, Debug, Clone, ToSchema, Default, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct CSOInvestigations {
    /// Admitted voters were recounted
    /// ("Toegelaten kiezers opnieuw vastgesteld?")
    pub admitted_voters_recounted: Vec<u32>,
    /// Investigated for other reasons than unexplained difference
    /// ("Onderzocht vanwege andere reden dan onverklaard verschil?")
    pub investigated_other_reason: Vec<u32>,
    /// Ballots were (partially) recounted
    /// ("Stembiljetten (deels) herteld?")
    pub ballots_recounted: Vec<u32>,
}

impl CSOInvestigations {
    pub fn append_result(
        &mut self,
        polling_station: &PollingStationForSession,
        result: &CSOFirstSessionResults,
    ) {
        if result.admitted_voters_have_been_recounted() {
            self.admitted_voters_recounted
                .push(polling_station.number());
        }

        if let Some(true) = result
            .extra_investigation
            .extra_investigation_other_reason
            .as_bool()
        {
            self.investigated_other_reason
                .push(polling_station.number());
        }

        if let Some(true) = result
            .extra_investigation
            .ballots_recounted_extra_investigation
            .as_bool()
        {
            self.ballots_recounted.push(polling_station.number());
        }
    }
}

/// Polling stations where results were investigated by the GSB,
/// as vectors of polling station numbers
#[derive(Serialize, Deserialize, Debug, Clone, ToSchema, Default, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct DSOInvestigations {
    /// Investigated because of an unaccounted-for difference
    /// ("Onderzocht vanwege een onverklaard verschil?")
    pub unaccounted_difference: Vec<u32>,
    /// Investigated because of a (suspected) other error
    /// ("Onderzocht vanwege (het vermoeden van) een andere fout?")
    pub other_error: Vec<u32>,
    /// Results were corrected
    /// ("Uitslag gecorrigeerd?")
    pub corrected_results: Vec<u32>,
}

impl DSOInvestigations {
    pub fn append_result(
        &mut self,
        polling_station: &PollingStationForSession,
        result: &DSOFirstSessionResults,
    ) {
        let checks = &result.checks_and_corrections;

        // investigation because of an unaccounted-for difference
        if checks
            .reason_investigation_own_initiative
            .unaccounted_difference
        {
            self.unaccounted_difference.push(polling_station.number());
        }

        // investigation because of a (suspected) other error
        if checks.reason_investigation_own_initiative.other_error {
            self.other_error.push(polling_station.number());
        }

        // whether the investigation has led to corrected results
        if checks.corrected_results_own_initiative.as_bool() == Some(true)
            || checks.corrected_results_csb_request.as_bool() == Some(true)
        {
            self.corrected_results.push(polling_station.number());
        }
    }
}

#[cfg(test)]
mod tests {
    use test_log::test;

    use super::*;
    use crate::domain::{
        committee_session::CommitteeSessionId,
        data_entry::DataEntryId,
        election::{CommitteeCategory::*, ElectionCategory, PGNumber, tests::election_fixture},
        polling_station::{
            PollingStation, PollingStationFirstSession, test_helpers::polling_stations_fixture,
        },
        results::{
            checks_and_corrections::{ChecksAndCorrections, ReasonInvestigationOwnInitiative},
            differences_counts::DifferencesCounts,
            extra_investigation::ExtraInvestigation,
            gsb_differences_counts::GSBDifferencesCounts,
            gsb_results::GSBResults,
            next_session_results::NextSessionResults,
            yes_no::YesNo,
        },
        sub_committee::{SubCommittee, SubCommitteeFirstSession, SubCommitteeId},
        valid_default::ValidDefault,
    };

    fn test_ps_to_source(polling_station: PollingStation) -> DataEntrySource {
        DataEntrySource::PollingStation(PollingStationForSession::First(
            PollingStationFirstSession {
                committee_session_id: CommitteeSessionId::from(0),
                polling_station,
                data_entry_id: DataEntryId::from(0),
            },
        ))
    }

    fn results_fixture_a() -> Results {
        Results::CSOFirstSession(CSOFirstSessionResults {
            extra_investigation: ValidDefault::valid_default(),
            counting_differences_polling_station: ValidDefault::valid_default(),
            voters_counts: VotersCounts {
                poll_card_count: 30,
                proxy_certificate_count: 4,
                voter_card_count: None,
                total_admitted_voters_count: 34,
            },
            votes_counts: VotesCounts {
                political_group_total_votes: vec![
                    PoliticalGroupTotalVotes {
                        number: PGNumber::from(1),
                        total: 20,
                    },
                    PoliticalGroupTotalVotes {
                        number: PGNumber::from(2),
                        total: 10,
                    },
                ],
                total_votes_candidates_count: 30,
                blank_votes_count: 2,
                invalid_votes_count: 3,
                total_votes_cast_count: 35,
            },
            differences_counts: {
                let mut tmp = DifferencesCounts::zero();
                tmp.more_ballots_count = 1;
                tmp.difference_completely_accounted_for = YesNo::yes();
                tmp.compare_votes_cast_admitted_voters
                    .votes_cast_greater_than_admitted_voters = true;
                tmp
            },
            political_group_votes: vec![
                PoliticalGroupCandidateVotes::from_test_data_auto(PGNumber::from(1), &[18, 2]),
                PoliticalGroupCandidateVotes::from_test_data_auto(PGNumber::from(2), &[4, 4, 2]),
            ],
        })
    }

    fn results_fixture_b() -> Results {
        Results::CSOFirstSession(CSOFirstSessionResults {
            extra_investigation: ExtraInvestigation {
                extra_investigation_other_reason: YesNo::yes(),
                ballots_recounted_extra_investigation: YesNo::no(),
            },
            counting_differences_polling_station: ValidDefault::valid_default(),
            voters_counts: VotersCounts {
                poll_card_count: 59,
                proxy_certificate_count: 1,
                voter_card_count: None,
                total_admitted_voters_count: 60,
            },
            votes_counts: VotesCounts {
                political_group_total_votes: vec![
                    PoliticalGroupTotalVotes {
                        number: PGNumber::from(1),
                        total: 24,
                    },
                    PoliticalGroupTotalVotes {
                        number: PGNumber::from(2),
                        total: 32,
                    },
                ],
                total_votes_candidates_count: 56,
                blank_votes_count: 2,
                invalid_votes_count: 0,
                total_votes_cast_count: 58,
            },
            differences_counts: {
                let mut tmp = DifferencesCounts::zero();
                tmp.fewer_ballots_count = 2;
                tmp.compare_votes_cast_admitted_voters
                    .votes_cast_smaller_than_admitted_voters = true;
                tmp.difference_completely_accounted_for = YesNo::no();
                tmp
            },
            political_group_votes: vec![
                PoliticalGroupCandidateVotes::from_test_data_auto(PGNumber::from(1), &[17, 7]),
                PoliticalGroupCandidateVotes::from_test_data_auto(PGNumber::from(2), &[12, 15, 5]),
            ],
        })
    }

    /// Election fixture for a decentrally counted (DSO) election.
    fn dso_election_fixture() -> ElectionWithPoliticalGroups {
        let mut election = election_fixture(ElectionCategory::Municipal, GSB, &[2, 3]);
        election.counting_method = Some(VoteCountingMethod::DSO);
        election
    }

    /// DSO first session results with the counts of [results_fixture_a]
    /// and the given checks and corrections.
    fn dso_results_fixture(checks_and_corrections: ChecksAndCorrections) -> Results {
        let Results::CSOFirstSession(cso_results) = results_fixture_a() else {
            unreachable!()
        };

        Results::DSOFirstSession(DSOFirstSessionResults {
            about_report: Default::default(),
            checks_and_corrections,
            voters_counts: cso_results.voters_counts,
            votes_counts: cso_results.votes_counts,
            differences_counts: cso_results.differences_counts,
            political_group_votes: cso_results.political_group_votes,
        })
    }

    fn gsb_results_fixture_a() -> Results {
        Results::GSB(GSBResults {
            voters_counts: VotersCounts {
                poll_card_count: 30,
                proxy_certificate_count: 4,
                voter_card_count: None,
                total_admitted_voters_count: 34,
            },
            votes_counts: VotesCounts {
                political_group_total_votes: vec![
                    PoliticalGroupTotalVotes {
                        number: PGNumber::from(1),
                        total: 20,
                    },
                    PoliticalGroupTotalVotes {
                        number: PGNumber::from(2),
                        total: 10,
                    },
                ],
                total_votes_candidates_count: 30,
                blank_votes_count: 2,
                invalid_votes_count: 3,
                total_votes_cast_count: 35,
            },
            differences_counts: GSBDifferencesCounts {
                more_ballots_count: 1,
                fewer_ballots_count: 0,
            },
            political_group_votes: vec![
                PoliticalGroupCandidateVotes::from_test_data_auto(PGNumber::from(1), &[18, 2]),
                PoliticalGroupCandidateVotes::from_test_data_auto(PGNumber::from(2), &[4, 4, 2]),
            ],
            number_of_voters: 90,
        })
    }

    fn gsb_results_fixture_b() -> Results {
        Results::GSB(GSBResults {
            voters_counts: VotersCounts {
                poll_card_count: 59,
                proxy_certificate_count: 1,
                voter_card_count: None,
                total_admitted_voters_count: 60,
            },
            votes_counts: VotesCounts {
                political_group_total_votes: vec![
                    PoliticalGroupTotalVotes {
                        number: PGNumber::from(1),
                        total: 24,
                    },
                    PoliticalGroupTotalVotes {
                        number: PGNumber::from(2),
                        total: 32,
                    },
                ],
                total_votes_candidates_count: 56,
                blank_votes_count: 2,
                invalid_votes_count: 0,
                total_votes_cast_count: 58,
            },
            differences_counts: GSBDifferencesCounts {
                more_ballots_count: 0,
                fewer_ballots_count: 2,
            },
            political_group_votes: vec![
                PoliticalGroupCandidateVotes::from_test_data_auto(PGNumber::from(1), &[17, 7]),
                PoliticalGroupCandidateVotes::from_test_data_auto(PGNumber::from(2), &[12, 15, 5]),
            ],
            number_of_voters: 100,
        })
    }

    #[test]
    fn test_differences_counts_addition() {
        let mut diff = DifferencesTotals::zero();
        let diff2 = CommonDifferencesCounts {
            more_ballots_count: &1,
            fewer_ballots_count: &0,
        };

        let mut ps = polling_stations_fixture(&[20, 20]);
        ps[0].number = 123;

        diff.add_results(&test_ps_to_source(ps[0].clone()), &diff2);

        assert_eq!(diff.more_ballots_count.count, 1);
        assert_eq!(
            diff.more_ballots_count.data_entry_sources,
            vec![DataEntrySourceNumber::PollingStation(123)]
        );
        assert_eq!(diff.fewer_ballots_count.count, 0);

        ps[1].number = 321;

        diff.add_results(&test_ps_to_source(ps[1].clone()), &diff2);

        assert_eq!(diff.more_ballots_count.count, 2);
        assert_eq!(
            diff.more_ballots_count.data_entry_sources,
            vec![
                DataEntrySourceNumber::PollingStation(123),
                DataEntrySourceNumber::PollingStation(321)
            ]
        );
    }

    #[test]
    fn test_political_group_counting() {
        let election = election_fixture(ElectionCategory::Municipal, GSB, &[2, 3]);
        let ps = polling_stations_fixture(&[20, 20]);
        let results = vec![
            (test_ps_to_source(ps[0].clone()), results_fixture_a()),
            (test_ps_to_source(ps[1].clone()), results_fixture_b()),
        ];
        let totals = ElectionTotals::tabulate(&election, &results).unwrap();

        // check values in the differences counts
        assert_eq!(totals.differences_counts.more_ballots_count.count, 1);
        // should be ps1 number in here
        assert_eq!(
            totals
                .differences_counts
                .more_ballots_count
                .data_entry_sources,
            vec![DataEntrySourceNumber::PollingStation(31)]
        );
        assert_eq!(totals.differences_counts.fewer_ballots_count.count, 2);
        // should be ps2 number in here
        assert_eq!(
            totals
                .differences_counts
                .fewer_ballots_count
                .data_entry_sources,
            vec![DataEntrySourceNumber::PollingStation(32)]
        );

        // tests for voters counts
        assert_eq!(totals.voters_counts.total_admitted_voters_count, 94);
        assert_eq!(totals.voters_counts.poll_card_count, 89);
        assert_eq!(totals.voters_counts.proxy_certificate_count, 5);
        assert_eq!(totals.voters_counts.voter_card_count, None);

        // tests for votes counts
        assert_eq!(totals.votes_counts.total_votes_cast_count, 93);
        assert_eq!(totals.votes_counts.total_votes_candidates_count, 86);
        assert_eq!(totals.votes_counts.blank_votes_count, 4);
        assert_eq!(totals.votes_counts.invalid_votes_count, 3);

        // finally the political group counts
        assert_eq!(totals.political_group_votes.len(), 2);
        let group1 = totals.political_group_votes.first().unwrap();
        assert_eq!(group1.total, 44);
        assert_eq!(group1.candidate_votes.len(), 2);

        assert_eq!(group1.candidate_votes.first().unwrap().votes, 35);
        assert_eq!(group1.candidate_votes.get(1).unwrap().votes, 9);

        let group2 = totals.political_group_votes.get(1).unwrap();
        assert_eq!(group2.total, 42);
        assert_eq!(group2.candidate_votes.len(), 3);

        assert_eq!(group2.candidate_votes.first().unwrap().votes, 16);
        assert_eq!(group2.candidate_votes.get(1).unwrap().votes, 19);
        assert_eq!(group2.candidate_votes.get(2).unwrap().votes, 7);
    }

    #[test]
    fn test_adding_zero_polling_stations() {
        let election = election_fixture(ElectionCategory::Municipal, GSB, &[10, 20, 18]);
        let totals = ElectionTotals::tabulate(&election, &[]).unwrap();
        assert_eq!(totals.voters_counts.total_admitted_voters_count, 0);
        assert_eq!(totals.votes_counts.total_votes_cast_count, 0);
    }

    #[test]
    fn test_adding_many_polling_stations() {
        let election = election_fixture(ElectionCategory::Municipal, GSB, &[2, 3]);
        let ps = polling_stations_fixture(&[20; 600]);
        let results_ps = results_fixture_a();
        let results = ps
            .iter()
            .map(|p| (test_ps_to_source(p.clone()), results_ps.clone()))
            .collect::<Vec<_>>();
        let totals = ElectionTotals::tabulate(&election, &results).unwrap();

        assert_eq!(totals.voters_counts.total_admitted_voters_count, 20400);
        assert_eq!(totals.votes_counts.total_votes_cast_count, 21000);
        assert_eq!(totals.political_group_votes[0].total, 12000);
        assert_eq!(
            totals.political_group_votes[0].candidate_votes[0].votes,
            10800
        );
    }

    #[test]
    #[should_panic]
    fn test_too_high_polling_station_numbers() {
        let election = election_fixture(ElectionCategory::Municipal, GSB, &[2, 3]);
        let ps = polling_stations_fixture(&[20; 5]);
        let mut ps_results = results_fixture_a();
        ps_results.political_group_votes_mut()[0].total = 999_999_998;
        ps_results.political_group_votes_mut()[0].candidate_votes[0].votes = 999_999_998;
        ps_results.political_group_votes_mut()[0].candidate_votes[1].votes = 0;
        ps_results.political_group_votes_mut()[1].total = 0;
        ps_results.political_group_votes_mut()[1].candidate_votes[0].votes = 0;
        ps_results.political_group_votes_mut()[1].candidate_votes[1].votes = 0;
        ps_results.political_group_votes_mut()[1].candidate_votes[2].votes = 0;
        ps_results.votes_counts_mut().political_group_total_votes[0].total = 999_999_998;
        ps_results.votes_counts_mut().political_group_total_votes[1].total = 0;
        ps_results.votes_counts_mut().total_votes_cast_count = 999_999_998;
        ps_results.votes_counts_mut().total_votes_candidates_count = 999_999_998;
        ps_results.votes_counts_mut().blank_votes_count = 0;
        ps_results.votes_counts_mut().invalid_votes_count = 0;
        ps_results.voters_counts_mut().poll_card_count = 999_999_998;
        ps_results.voters_counts_mut().proxy_certificate_count = 0;
        ps_results.voters_counts_mut().total_admitted_voters_count = 999_999_998;
        if let Results::CSOFirstSession(ref mut results) = ps_results {
            results.differences_counts.more_ballots_count = 0;
            results
                .differences_counts
                .compare_votes_cast_admitted_voters
                .votes_cast_greater_than_admitted_voters = false;
            results
                .differences_counts
                .compare_votes_cast_admitted_voters
                .admitted_voters_equal_votes_cast = true;
        }

        let results = ps
            .iter()
            .map(|p| (test_ps_to_source(p.clone()), ps_results.clone()))
            .collect::<Vec<_>>();
        let _totals = ElectionTotals::tabulate(&election, &results);
    }

    #[test]
    fn test_invalid_polling_station_data_does_not_add() {
        let election = election_fixture(ElectionCategory::Municipal, GSB, &[2, 3]);
        let ps = polling_stations_fixture(&[20, 20]);
        let ps_results = results_fixture_a();
        let mut ps_results2 = ps_results.clone();
        ps_results2.votes_counts_mut().total_votes_cast_count = 0;

        let totals = ElectionTotals::tabulate(
            &election,
            &[
                (test_ps_to_source(ps[0].clone()), ps_results),
                (test_ps_to_source(ps[1].clone()), ps_results2),
            ],
        );

        assert!(totals.is_err());
    }

    #[test]
    fn test_repeated_polling_stations() {
        let election = election_fixture(ElectionCategory::Municipal, GSB, &[2, 3]);
        let ps = polling_stations_fixture(&[20, 20]);
        let totals = ElectionTotals::tabulate(
            &election,
            &[
                (test_ps_to_source(ps[0].clone()), results_fixture_a()),
                (test_ps_to_source(ps[0].clone()), results_fixture_b()),
                (test_ps_to_source(ps[1].clone()), results_fixture_b()),
            ],
        );

        assert!(totals.is_err());
    }

    #[test]
    fn test_missing_votes_count_political_groups_total() {
        let election = election_fixture(ElectionCategory::Municipal, GSB, &[2, 3]);
        let ps = polling_stations_fixture(&[20, 20]);
        let ps1_result = results_fixture_a();
        let mut ps2_result = results_fixture_b();
        ps2_result
            .votes_counts_mut()
            .political_group_total_votes
            .pop();
        let totals = ElectionTotals::tabulate(
            &election,
            &[
                (test_ps_to_source(ps[0].clone()), ps1_result),
                (test_ps_to_source(ps[1].clone()), ps2_result),
            ],
        );

        assert!(totals.is_err());
    }

    #[test]
    fn test_too_many_votes_count_political_groups_total() {
        let election = election_fixture(ElectionCategory::Municipal, GSB, &[2, 3]);
        let ps = polling_stations_fixture(&[20, 20]);
        let ps1_result = results_fixture_a();
        let mut ps2_result = results_fixture_b();
        ps2_result
            .votes_counts_mut()
            .political_group_total_votes
            .push(PoliticalGroupTotalVotes {
                number: PGNumber::from(3),
                total: 0,
            });
        let totals = ElectionTotals::tabulate(
            &election,
            &[
                (test_ps_to_source(ps[0].clone()), ps1_result),
                (test_ps_to_source(ps[1].clone()), ps2_result),
            ],
        );

        assert!(totals.is_err());
    }

    #[test]
    fn test_duplicate_votes_count_political_groups_total() {
        let election = election_fixture(ElectionCategory::Municipal, GSB, &[2, 3]);
        let ps = polling_stations_fixture(&[20, 20]);
        let ps1_result = results_fixture_a();
        let mut ps2_result = results_fixture_b();
        let pgvote_copy = ps2_result.votes_counts().political_group_total_votes[1].clone();
        ps2_result
            .votes_counts_mut()
            .political_group_total_votes
            .push(pgvote_copy);
        let totals = ElectionTotals::tabulate(
            &election,
            &[
                (test_ps_to_source(ps[0].clone()), ps1_result),
                (test_ps_to_source(ps[1].clone()), ps2_result),
            ],
        );

        assert!(totals.is_err());
    }

    #[test]
    fn test_invalid_votes_count_political_group_total() {
        let election = election_fixture(ElectionCategory::Municipal, GSB, &[2, 3]);
        let ps = polling_stations_fixture(&[20, 20]);
        let ps1_result = results_fixture_a();
        let mut ps2_result = results_fixture_b();
        ps2_result.votes_counts_mut().political_group_total_votes[1] = PoliticalGroupTotalVotes {
            number: PGNumber::from(3),
            total: 0,
        };
        let totals = ElectionTotals::tabulate(
            &election,
            &[
                (test_ps_to_source(ps[0].clone()), ps1_result),
                (test_ps_to_source(ps[1].clone()), ps2_result),
            ],
        );

        assert!(totals.is_err());
    }

    #[test]
    fn test_missing_political_groups() {
        let election = election_fixture(ElectionCategory::Municipal, GSB, &[2, 3]);
        let ps = polling_stations_fixture(&[20, 20]);
        let ps1_result = results_fixture_a();
        let mut ps2_result = results_fixture_b();
        ps2_result.political_group_votes_mut().pop();
        let totals = ElectionTotals::tabulate(
            &election,
            &[
                (test_ps_to_source(ps[0].clone()), ps1_result),
                (test_ps_to_source(ps[1].clone()), ps2_result),
            ],
        );

        assert!(totals.is_err());
    }

    #[test]
    fn test_too_many_political_groups() {
        let election = election_fixture(ElectionCategory::Municipal, GSB, &[2, 3]);
        let ps = polling_stations_fixture(&[20, 20]);
        let ps1_result = results_fixture_a();
        let mut ps2_result = results_fixture_b();
        ps2_result.political_group_votes_mut().push(
            PoliticalGroupCandidateVotes::from_test_data_auto(PGNumber::from(3), &[0]),
        );
        let totals = ElectionTotals::tabulate(
            &election,
            &[
                (test_ps_to_source(ps[0].clone()), ps1_result),
                (test_ps_to_source(ps[1].clone()), ps2_result),
            ],
        );

        assert!(totals.is_err());
    }

    #[test]
    fn test_duplicate_political_group() {
        let election = election_fixture(ElectionCategory::Municipal, GSB, &[2, 3]);
        let ps = polling_stations_fixture(&[20, 20]);
        let mut ps1_result = results_fixture_a();
        let ps1_pgvote_copy = ps1_result.political_group_votes()[1].clone();
        let mut ps2_result = results_fixture_b();
        let ps2_pgvote_copy = ps2_result.political_group_votes()[1].clone();
        ps1_result.political_group_votes_mut().push(ps1_pgvote_copy);
        ps2_result.political_group_votes_mut().push(ps2_pgvote_copy);
        let totals = ElectionTotals::tabulate(
            &election,
            &[
                (test_ps_to_source(ps[0].clone()), ps1_result),
                (test_ps_to_source(ps[1].clone()), ps2_result),
            ],
        );

        assert!(totals.is_err());
    }

    #[test]
    fn test_invalid_political_group() {
        let election = election_fixture(ElectionCategory::Municipal, GSB, &[2, 3]);
        let ps = polling_stations_fixture(&[20, 20]);
        let ps1_result = results_fixture_a();
        let mut ps2_result = results_fixture_b();
        ps2_result.political_group_votes_mut()[1] =
            PoliticalGroupCandidateVotes::from_test_data_auto(PGNumber::from(3), &[0]);
        let totals = ElectionTotals::tabulate(
            &election,
            &[
                (test_ps_to_source(ps[0].clone()), ps1_result),
                (test_ps_to_source(ps[1].clone()), ps2_result),
            ],
        );

        assert!(totals.is_err());
    }

    #[test]
    fn test_invalid_number_of_candidates() {
        let election = election_fixture(ElectionCategory::Municipal, GSB, &[2, 3]);
        let ps = polling_stations_fixture(&[20, 20]);
        let ps1_result = results_fixture_a();
        let mut ps2_result = results_fixture_b();
        ps2_result.political_group_votes_mut()[1]
            .candidate_votes
            .pop();
        let totals = ElectionTotals::tabulate(
            &election,
            &[
                (test_ps_to_source(ps[0].clone()), ps1_result),
                (test_ps_to_source(ps[1].clone()), ps2_result),
            ],
        );

        assert!(totals.is_err());
    }

    #[test]
    fn test_investigation() {
        let election = election_fixture(ElectionCategory::Municipal, GSB, &[2, 3]);
        let ps = polling_stations_fixture(&[20, 20]);
        let ps1_result = results_fixture_a();
        let ps2_result = results_fixture_b();
        let totals = ElectionTotals::tabulate(
            &election,
            &[
                (test_ps_to_source(ps[0].clone()), ps1_result),
                (test_ps_to_source(ps[1].clone()), ps2_result),
            ],
        )
        .unwrap();
        let CommitteeSpecificTotals::GSB(GSBTotals::CSO(investigations)) =
            totals.committee_specific
        else {
            panic!("Expected CSO investigations in the totals");
        };
        assert_eq!(investigations.admitted_voters_recounted, vec![32]);
        assert_eq!(investigations.investigated_other_reason, vec![32]);
        assert!(investigations.ballots_recounted.is_empty());
    }

    #[test]
    fn test_gsb_number_of_voters() {
        let election = election_fixture(ElectionCategory::Municipal, CSB, &[2, 3]);
        let gsb1_result = gsb_results_fixture_a();
        let gsb2_result = gsb_results_fixture_b();

        let totals = ElectionTotals::tabulate(
            &election,
            &[
                (
                    DataEntrySource::SubCommittee(SubCommitteeFirstSession {
                        committee_session_id: CommitteeSessionId::from(0),
                        sub_committee: SubCommittee {
                            id: SubCommitteeId::from(1),
                            number: 1,
                            name: "A".to_string(),
                            category: GSB,
                        },
                        data_entry_id: DataEntryId::from(0),
                    }),
                    gsb1_result,
                ),
                (
                    DataEntrySource::SubCommittee(SubCommitteeFirstSession {
                        committee_session_id: CommitteeSessionId::from(0),
                        sub_committee: SubCommittee {
                            id: SubCommitteeId::from(2),
                            number: 2,
                            name: "B".to_string(),
                            category: GSB,
                        },
                        data_entry_id: DataEntryId::from(1),
                    }),
                    gsb2_result,
                ),
            ],
        )
        .unwrap();

        assert_eq!(
            totals.committee_specific,
            CommitteeSpecificTotals::CSB {
                number_of_voters: 190
            }
        );
    }

    #[test]
    fn test_dso_investigations() {
        let election = dso_election_fixture();
        let ps = polling_stations_fixture(&[20, 20, 20]);
        // first polling station: investigated because of an unaccounted-for difference,
        // results corrected on the GSB's own initiative
        let ps1_result = dso_results_fixture(ChecksAndCorrections {
            reason_investigation_own_initiative: ReasonInvestigationOwnInitiative {
                unaccounted_difference: true,
                other_error: false,
            },
            corrected_results_own_initiative: YesNo::yes(),
            corrected_results_csb_request: YesNo::no(),
        });
        // second polling station: investigated because of a (suspected) other error,
        // results corrected at the request of the CSB
        let ps2_result = dso_results_fixture(ChecksAndCorrections {
            reason_investigation_own_initiative: ReasonInvestigationOwnInitiative {
                unaccounted_difference: false,
                other_error: true,
            },
            corrected_results_own_initiative: YesNo::no(),
            corrected_results_csb_request: YesNo::yes(),
        });
        // third polling station: not investigated
        let ps3_result = dso_results_fixture(ChecksAndCorrections::default());

        let totals = ElectionTotals::tabulate(
            &election,
            &[
                (test_ps_to_source(ps[0].clone()), ps1_result),
                (test_ps_to_source(ps[1].clone()), ps2_result),
                (test_ps_to_source(ps[2].clone()), ps3_result),
            ],
        )
        .unwrap();

        let CommitteeSpecificTotals::GSB(GSBTotals::DSO(investigations)) =
            totals.committee_specific
        else {
            panic!("Expected DSO investigations in the totals");
        };
        assert_eq!(investigations.unaccounted_difference, vec![31]);
        assert_eq!(investigations.other_error, vec![32]);
        assert_eq!(investigations.corrected_results, vec![31, 32]);
    }

    #[test]
    fn test_dso_corrected_results_merged() {
        let election = dso_election_fixture();
        let ps = polling_stations_fixture(&[20]);
        // results corrected both on the GSB own initiative and at the
        // request of the CSB: the station should be listed only once
        let ps1_result = dso_results_fixture(ChecksAndCorrections {
            reason_investigation_own_initiative: ReasonInvestigationOwnInitiative::default(),
            corrected_results_own_initiative: YesNo::yes(),
            corrected_results_csb_request: YesNo::yes(),
        });

        let totals =
            ElectionTotals::tabulate(&election, &[(test_ps_to_source(ps[0].clone()), ps1_result)])
                .unwrap();

        let CommitteeSpecificTotals::GSB(GSBTotals::DSO(investigations)) =
            totals.committee_specific
        else {
            panic!("Expected DSO investigations in the totals");
        };
        assert!(investigations.unaccounted_difference.is_empty());
        assert!(investigations.other_error.is_empty());
        assert_eq!(investigations.corrected_results, vec![31]);
    }

    #[test]
    fn test_dso_next_session_results() {
        let election = dso_election_fixture();
        let ps = polling_stations_fixture(&[20, 20]);
        let ps1_result = dso_results_fixture(ChecksAndCorrections {
            reason_investigation_own_initiative: ReasonInvestigationOwnInitiative {
                unaccounted_difference: true,
                other_error: false,
            },
            corrected_results_own_initiative: YesNo::yes(),
            corrected_results_csb_request: YesNo::no(),
        });
        // next session results with the counts of results_fixture_b
        let Results::CSOFirstSession(cso_results) = results_fixture_b() else {
            unreachable!()
        };
        let ps2_result = Results::DSONextSession(NextSessionResults {
            voters_counts: cso_results.voters_counts,
            votes_counts: cso_results.votes_counts,
            differences_counts: cso_results.differences_counts,
            political_group_votes: cso_results.political_group_votes,
        });

        let totals = ElectionTotals::tabulate(
            &election,
            &[
                (test_ps_to_source(ps[0].clone()), ps1_result),
                (test_ps_to_source(ps[1].clone()), ps2_result),
            ],
        )
        .unwrap();

        // the counts of both results are added to the totals
        assert_eq!(totals.voters_counts.total_admitted_voters_count, 94);
        assert_eq!(totals.votes_counts.total_votes_cast_count, 93);

        // only the first session result contributes investigations
        let CommitteeSpecificTotals::GSB(GSBTotals::DSO(investigations)) =
            totals.committee_specific
        else {
            panic!("Expected DSO investigations in the totals");
        };
        assert_eq!(investigations.unaccounted_difference, vec![31]);
        assert!(investigations.other_error.is_empty());
        assert_eq!(investigations.corrected_results, vec![31]);
    }

    #[test]
    fn test_result_model_must_match_election() {
        let ps = polling_stations_fixture(&[20]);
        let source = || test_ps_to_source(ps[0].clone());
        let cso_election = election_fixture(ElectionCategory::Municipal, GSB, &[2, 3]);
        let dso_election = dso_election_fixture();
        let csb_election = election_fixture(ElectionCategory::Municipal, CSB, &[2, 3]);
        let dso_result = || dso_results_fixture(ChecksAndCorrections::default());

        // a CSO result in a DSO election
        let totals = ElectionTotals::tabulate(&dso_election, &[(source(), results_fixture_a())]);
        assert!(totals.is_err());

        // a DSO result in a CSO election
        let totals = ElectionTotals::tabulate(&cso_election, &[(source(), dso_result())]);
        assert!(totals.is_err());

        // a GSB result in a GSB election
        let totals =
            ElectionTotals::tabulate(&cso_election, &[(source(), gsb_results_fixture_a())]);
        assert!(totals.is_err());

        // a CSO result in a CSB election
        let totals = ElectionTotals::tabulate(&csb_election, &[(source(), results_fixture_a())]);
        assert!(totals.is_err());

        // a DSO result in a CSB election
        let totals = ElectionTotals::tabulate(&csb_election, &[(source(), dso_result())]);
        assert!(totals.is_err());
    }

    #[test]
    fn test_cso_investigations_requires_cso_totals() {
        let cso_election = election_fixture(ElectionCategory::Municipal, GSB, &[2, 3]);
        let cso_totals = ElectionTotals::tabulate(&cso_election, &[]).unwrap();
        assert!(cso_totals.cso_investigations().is_ok());

        let dso_totals = ElectionTotals::tabulate(&dso_election_fixture(), &[]).unwrap();
        assert!(dso_totals.cso_investigations().is_err());

        let csb_election = election_fixture(ElectionCategory::Municipal, CSB, &[2, 3]);
        let csb_totals = ElectionTotals::tabulate(&csb_election, &[]).unwrap();
        assert!(csb_totals.cso_investigations().is_err());
    }
}
