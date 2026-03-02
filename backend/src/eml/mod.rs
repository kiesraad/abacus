use std::num::NonZeroU64;

mod error;
pub mod hash;

use chrono::{DateTime, Local, Utc};
use eml_nl::{
    EMLError,
    common::{
        AuthorityIdentifier, ContestIdentifier, ElectionDomain, ElectionTree, ManagingAuthority,
        PersonName, ReportingUnitIdentifier,
    },
    documents::{
        candidate_lists::{
            CandidateLists, CandidateListsAffiliation, CandidateListsCandidate,
            CandidateListsContest, QualifyingAddress,
        },
        election_count::{
            AffiliationSelection, CountType, ElectionCount, ElectionCountContest,
            ElectionCountSelection, InvestigationReason, RejectedVotesReason, ReportingUnitVotes,
            ReportingUnitVotesBuilder, UncountedVotesReason,
        },
        election_definition::{ElectionDefinition, ElectionDefinitionRegisteredParty},
        polling_stations::{PollingPlace, PollingStations, PollingStationsContest},
    },
    io::{EMLParsingMode, EMLRead as _},
    utils::{
        AffiliationId, AffiliationType, AuthorityId, CandidateId, ElectionDomainId, ElectionId,
        Gender, ReportingUnitIdentifierId, StringValueData, VotingChannelType, VotingMethod,
    },
};
pub use error::EMLImportError;
pub use hash::{EmlHash, RedactedEmlHash};

use crate::domain::{
    committee_session::CommitteeSession,
    data_entry::PoliticalGroupCandidateVotes,
    election::{
        Candidate, CandidateGender, CandidateNumber, ElectionRole, ElectionWithPoliticalGroups,
        NewElection, PGNumber, PoliticalGroup, VoteCountingMethod,
    },
    summary::ElectionSummary,
};

impl NewElection {
    pub fn from_eml_str(election_definition_data: &str) -> Result<Self, EMLImportError> {
        // attempt to parse in strict mode (we don't expect any errors in this EML)
        let definition =
            ElectionDefinition::parse_eml(election_definition_data, EMLParsingMode::Strict).ok()?;
        Self::from_eml(&definition)
    }

    pub fn from_eml(definition: &ElectionDefinition) -> Result<Self, EMLImportError> {
        // extract common information
        let election = &definition.election_event.election;
        let identifier = &election.identifier;
        let category = identifier.category.copied_value()?;
        let election_date = identifier.election_date.copied_value()?.date;
        let nomination_date = identifier.nomination_date.copied_value()?.date;

        // we currently only support GR elections
        if category != eml_nl::utils::ElectionCategory::GR {
            return Err(EMLImportError::OnlyMunicipalSupported);
        }

        // we need the election domain and its id
        let Some(domain) = &identifier.domain else {
            return Err(EMLImportError::MissingElectionDomain);
        };
        let Some(domain_id) = &domain.id else {
            return Err(EMLImportError::MissingElectionDomain);
        };

        // we need the number of seats and it must be a valid u32
        let number_of_seats = election.number_of_seats.copied_value()?;
        let number_of_seats = number_of_seats
            .try_into()
            .map_err(|_| EMLImportError::NumberOfSeatsNotInRange)?;

        // typically number of voters is not available in the EML, but it could
        // be so we try and extract it anyway
        let number_of_voters = election
            .contest
            .max_votes
            .copied_value()
            .map(|v| v.get())
            .unwrap_or(0)
            .try_into()
            .unwrap_or(0);

        // the number of seats must be between 9 and 45 for municipal elections
        // clippy suggests way less readable alternative
        #[allow(clippy::manual_range_contains)]
        if number_of_seats < 9 || number_of_seats > 45 {
            return Err(EMLImportError::NumberOfSeatsNotInRange);
        }

        // extract initial listing of political groups
        let political_groups = election
            .registered_parties
            .iter()
            .enumerate()
            .map(|(idx, rp)| {
                Ok(PoliticalGroup {
                    // temporary group number, actual group numbers will be imported from candidate list
                    number: PGNumber::from(
                        u32::try_from(idx + 1).or(Err(EMLImportError::TooManyPoliticalGroups))?,
                    ),
                    name: rp.registered_appellation.clone(),
                    candidates: vec![],
                })
            })
            .collect::<Result<Vec<PoliticalGroup>, EMLImportError>>()?;

        Ok(Self {
            name: identifier.name.clone(),
            role: ElectionRole::GSB,
            counting_method: VoteCountingMethod::CSO,
            election_id: identifier.id.raw().into_owned(),
            location: domain.name.clone(),
            domain_id: domain_id.raw().into_owned(),
            category: crate::domain::election::ElectionCategory::Municipal,
            number_of_seats,
            number_of_voters,
            election_date,
            nomination_date,
            political_groups,
        })
    }

    pub fn add_candidates_from_eml_str(
        &mut self,
        candidate_list_data: &str,
    ) -> Result<(), EMLImportError> {
        let candidate_list =
            CandidateLists::parse_eml(candidate_list_data, EMLParsingMode::Strict).ok()?;

        self.add_candidates_from_eml(&candidate_list)
    }

    pub fn add_candidates_from_eml(
        &mut self,
        candidate_lists: &CandidateLists,
    ) -> Result<(), EMLImportError> {
        let election = &candidate_lists.candidate_list.election;
        let identifier = &election.identifier;
        let election_id = identifier.id.cloned_value()?;
        let election_date = identifier.election_date.copied_value()?.date;

        if self.election_id != election_id.to_raw_value() {
            return Err(EMLImportError::MismatchElection);
        }

        if self.election_date != election_date {
            return Err(EMLImportError::MismatchElectionDate);
        }

        let contest = election
            .contests
            .first()
            .ok_or(EMLImportError::CandidateListWithoutContest)?;

        // extract initial listing of political groups with candidates
        let mut previous_pg_number = PGNumber::from(0);
        self.political_groups = contest
            .affiliations
            .iter()
            .map(|aff| {
                let pg = PoliticalGroup::from_candidates_list_affiliation(aff)?;
                if pg.number <= previous_pg_number {
                    return Err(EMLImportError::PoliticalGroupNumbersNotIncreasing {
                        expected_larger_than: previous_pg_number,
                        found: pg.number,
                    });
                }

                previous_pg_number = pg.number;
                Ok(pg)
            })
            .collect::<Result<Vec<PoliticalGroup>, EMLImportError>>()?;
        Ok(())
    }
}

impl PoliticalGroup {
    pub fn from_candidates_list_affiliation(
        aff: &CandidateListsAffiliation,
    ) -> Result<Self, EMLImportError> {
        let identifier = &aff.identifier;
        let pg_number = identifier
            .id
            .value()?
            .value()
            .parse::<u32>()
            .map(PGNumber::from)
            .or(Err(EMLImportError::TooManyPoliticalGroups))?;

        let mut previous_can_number = CandidateNumber::from(0);
        Ok(PoliticalGroup {
            number: pg_number,
            name: identifier.registered_name.clone().unwrap_or_default(),
            candidates: aff
                .candidates
                .iter()
                .map(|can| {
                    let candidate = Candidate::from_candidate_lists_candidate(can)?;

                    if candidate.number <= previous_can_number {
                        return Err(EMLImportError::CandidateNumbersNotIncreasing {
                            political_group_number: pg_number,
                            expected_larger_than: previous_can_number,
                            found: candidate.number,
                        });
                    }

                    previous_can_number = candidate.number;
                    Ok(candidate)
                })
                .collect::<Result<Vec<Candidate>, EMLImportError>>()?,
        })
    }
}

impl Candidate {
    pub fn from_candidate_lists_candidate(
        can: &CandidateListsCandidate,
    ) -> Result<Self, EMLImportError> {
        Ok(Candidate {
            number: can
                .identifier
                .id
                .value()?
                .value()
                .parse::<u32>()
                .map(CandidateNumber::from)
                .or(Err(EMLImportError::InvalidCandidate))?,
            initials: can
                .full_name
                .person_name
                .get_initials()
                .unwrap_or_default()
                .to_string(),
            first_name: can
                .full_name
                .person_name
                .get_first_name()
                .map(str::to_string),
            last_name_prefix: can
                .full_name
                .person_name
                .get_name_prefix()
                .map(str::to_string),
            last_name: can.full_name.person_name.get_last_name().to_string(),
            locality: can
                .qualifying_address
                .as_ref()
                .map(|qa| qa.locality().locality_name().to_string())
                .unwrap_or_default(),
            country_code: can
                .qualifying_address
                .as_ref()
                .and_then(|qa| qa.country_name_code())
                .map(|code| code.value.clone()),
            gender: match &can.gender {
                None => None,
                Some(gender) => {
                    let gender = gender.copied_value()?;
                    match gender {
                        Gender::Male => Some(CandidateGender::Male),
                        Gender::Female => Some(CandidateGender::Female),
                        Gender::Unknown => None,
                    }
                }
            },
        })
    }
}

impl ElectionWithPoliticalGroups {
    /// Get the EML election category for this election.
    pub fn get_eml_category(&self) -> eml_nl::utils::ElectionCategory {
        match self.category {
            crate::domain::election::ElectionCategory::Municipal => {
                eml_nl::utils::ElectionCategory::GR
            }
        }
    }

    /// Get the EML election subcategory for this election.
    pub fn get_eml_subcategory(&self) -> eml_nl::utils::ElectionSubcategory {
        match self.category {
            crate::domain::election::ElectionCategory::Municipal => {
                if self.number_of_seats < 19 {
                    eml_nl::utils::ElectionSubcategory::GR1
                } else {
                    eml_nl::utils::ElectionSubcategory::GR2
                }
            }
        }
    }

    /// Get the preference threshold for this election, which is used in the EML definition.
    pub fn get_eml_preference_threshold(&self) -> u64 {
        match self.get_eml_subcategory() {
            eml_nl::utils::ElectionSubcategory::GR1 => 50,
            _ => 25,
        }
    }

    /// Create a prefilled builder that allows construction of election
    /// identifiers for different EML documents.
    pub fn get_eml_election_identifier_builder(
        &self,
    ) -> Result<eml_nl::documents::ElectionIdentifierBuilder, EMLError> {
        Ok(eml_nl::documents::ElectionIdentifierBuilder::new()
            .id(ElectionId::new(&self.election_id)?)
            .name(&self.name)
            .election_date(self.election_date)
            .nomination_date(self.nomination_date)
            .category(self.get_eml_category())
            .subcategory(self.get_eml_subcategory())
            .domain(ElectionDomain::new(
                Some(ElectionDomainId::new(&self.domain_id)?),
                &self.location,
            )))
    }

    pub fn as_candidates_eml(
        &self,
        transaction_id: Option<u64>,
        timestamp: Option<DateTime<Utc>>,
    ) -> Result<CandidateLists, EMLError> {
        let timestamp = timestamp.unwrap_or_else(Utc::now);

        CandidateLists::builder()
            .transaction_id(transaction_id.unwrap_or(1))
            .managing_authority(ManagingAuthority::new(
                AuthorityIdentifier::new(AuthorityId::new(&self.domain_id)?)
                    .with_name(&self.location),
            ))
            .issue_date(timestamp.date_naive())
            .creation_date_time(timestamp)
            .election_identifier(
                self.get_eml_election_identifier_builder()?
                    .build_for_candidate_lists()?,
            )
            .contests([CandidateListsContest::builder()
                .identifier(ContestIdentifier::geen())
                .affiliations(
                    self.political_groups
                        .iter()
                        .map(|pg| {
                            CandidateListsAffiliation::builder()
                                .affiliation_type(AffiliationType::StandAloneList)
                                .registered_name(&pg.name)
                                .id(AffiliationId::new(pg.number.as_internal_u32().to_string())?)
                                .candidates(
                                    pg.candidates
                                        .iter()
                                        .map(|can| {
                                            CandidateListsCandidate::builder()
                                                .full_name(
                                                    PersonName::new(&can.last_name)
                                                        .with_first_name_option(
                                                            can.first_name.as_ref(),
                                                        )
                                                        .with_initials_option(
                                                            if can.initials.is_empty() {
                                                                None
                                                            } else {
                                                                Some(&can.initials)
                                                            },
                                                        )
                                                        .with_name_prefix_option(
                                                            can.last_name_prefix.as_ref(),
                                                        ),
                                                )
                                                .qualifying_address(QualifyingAddress::new(
                                                    &can.locality[..],
                                                    can.country_code.as_deref(),
                                                ))
                                                .build()
                                        })
                                        .collect::<Result<Vec<_>, EMLError>>()?,
                                )
                                .build()
                        })
                        .collect::<Result<Vec<_>, EMLError>>()?,
                )
                .build()?])
            .build()
    }

    pub fn as_definition_eml(
        &self,
        transaction_id: Option<u64>,
        timestamp: Option<DateTime<Utc>>,
    ) -> Result<ElectionDefinition, EMLError> {
        let timestamp = timestamp.unwrap_or_else(Utc::now);

        ElectionDefinition::builder()
            .transaction_id(transaction_id.unwrap_or(1))
            .managing_authority(ManagingAuthority::new(
                AuthorityIdentifier::new(AuthorityId::new(&self.domain_id)?)
                    .with_name(&self.location),
            ))
            .issue_date(timestamp.date_naive())
            .creation_date_time(timestamp)
            .election_identifier(
                self.get_eml_election_identifier_builder()?
                    .build_for_definition()?,
            )
            .number_of_seats(self.number_of_seats)
            .contest_identifier(ContestIdentifier::geen())
            .election_tree(ElectionTree::new(vec![]))
            .max_votes(
                NonZeroU64::new(self.number_of_voters as u64)
                    .ok_or(EMLError::custom("number of voters must be greater than 0"))?,
            )
            .preference_threshold(self.get_eml_preference_threshold())
            .voting_method(VotingMethod::SPV)
            .registered_parties(
                self.political_groups
                    .iter()
                    .map(|pg| Ok(ElectionDefinitionRegisteredParty::new(&pg.name)))
                    .collect::<Result<Vec<_>, EMLError>>()?,
            )
            .build()
    }

    pub fn as_polling_stations_eml(
        &self,
        polling_stations: &[crate::domain::polling_station::PollingStation],
        transaction_id: Option<u64>,
        timestamp: Option<DateTime<Utc>>,
    ) -> Result<PollingStations, EMLError> {
        let timestamp = timestamp.unwrap_or_else(Utc::now);

        PollingStations::builder()
            .transaction_id(transaction_id.unwrap_or(1))
            .managing_authority(ManagingAuthority::new(
                AuthorityIdentifier::new(AuthorityId::new(&self.domain_id)?)
                    .with_name(&self.location),
            ))
            .issue_date(timestamp.date_naive())
            .creation_date_time(timestamp)
            .election_identifier(
                self.get_eml_election_identifier_builder()?
                    .build_for_polling_stations()?,
            )
            .contests([PollingStationsContest::builder()
                .max_votes(
                    NonZeroU64::new(self.number_of_voters as u64)
                        .ok_or(EMLError::custom("number of voters must be greater than 0"))?,
                )
                .polling_places(
                    polling_stations
                        .iter()
                        .map(|ps| {
                            PollingPlace::builder()
                                .channel(VotingChannelType::Polling)
                                .locality_name(&ps.locality[..])
                                .postal_code(&ps.postal_code[..])
                                .polling_station_id(ps.id.as_internal_u32() as u64)
                                .polling_station_data_option(
                                    ps.number_of_voters.map(|n| n.to_string()),
                                )
                                .build()
                        })
                        .collect::<Result<Vec<_>, EMLError>>()?,
                )
                .build()?])
            .build()
    }

    pub fn as_count_eml(
        &self,
        transaction_id: Option<u64>,
        committee_session: &CommitteeSession,
        results: &[(
            crate::domain::polling_station::PollingStation,
            crate::domain::data_entry::PollingStationResults,
        )],
        summary: &ElectionSummary,
        timestamp: DateTime<Local>,
    ) -> Result<ElectionCount, EMLError> {
        let authority_id = self.domain_id.clone(); // TODO (post 1.0): replace with election tree when that is available

        ElectionCount::builder()
            .transaction_id(transaction_id.unwrap_or(1))
            .managing_authority(ManagingAuthority::new(
                AuthorityIdentifier::new(AuthorityId::new(&self.domain_id)?)
                    .with_name(&self.location),
            ))
            .creation_date_time(timestamp)
            .election_identifier(
                self.get_eml_election_identifier_builder()?
                    .build_for_count()?,
            )
            .count_type(CountType::Municipal)
            .contests([self.as_eml_count_contest(
                committee_session,
                results,
                summary,
                &authority_id,
            )?])
            .build()
    }

    fn as_eml_count_contest(
        &self,
        committee_session: &CommitteeSession,
        results: &[(
            crate::domain::polling_station::PollingStation,
            crate::domain::data_entry::PollingStationResults,
        )],
        summary: &ElectionSummary,
        authority_id: &str,
    ) -> Result<ElectionCountContest, EMLError> {
        ElectionCountContest::builder()
            .identifier(ContestIdentifier::geen())
            .total_eligible_voter_count(self.number_of_voters)
            .total_candidate_votes_count(summary.votes_counts.total_votes_candidates_count)
            .total_rejected_votes(
                RejectedVotesReason::Blank,
                summary.votes_counts.blank_votes_count,
            )
            .total_rejected_votes(
                RejectedVotesReason::Invalid,
                summary.votes_counts.invalid_votes_count,
            )
            .total_uncounted_votes(
                UncountedVotesReason::ValidPollCards,
                summary.voters_counts.poll_card_count,
            )
            .total_uncounted_votes(
                UncountedVotesReason::ValidProxyCertificates,
                summary.voters_counts.proxy_certificate_count,
            )
            .total_uncounted_votes(
                UncountedVotesReason::AdmittedVoters,
                summary.voters_counts.total_admitted_voters_count,
            )
            .total_uncounted_votes(
                UncountedVotesReason::MoreBallotsCounted,
                summary.differences_counts.more_ballots_count.count,
            )
            .total_uncounted_votes(
                UncountedVotesReason::FewerBallotsCounted,
                summary.differences_counts.fewer_ballots_count.count,
            )
            .total_votes_selections(self.as_eml_count_selections(&summary.political_group_votes)?)
            .reporting_unit_votes(
                results
                    .iter()
                    .map(|(ps, ps_res)| {
                        self.as_eml_reporting_unit_votes(
                            committee_session,
                            authority_id,
                            ps,
                            ps_res,
                        )
                    })
                    .collect::<Result<Vec<_>, EMLError>>()?,
            )
            .build()
    }

    fn as_eml_count_selections(
        &self,
        votes: &[PoliticalGroupCandidateVotes],
    ) -> Result<Vec<ElectionCountSelection>, EMLError> {
        let mut selections = vec![];

        for pg in votes {
            let epg = self.political_groups.iter().find(|p| p.number == pg.number);
            selections.push(
                ElectionCountSelection::builder()
                    .affiliation(AffiliationSelection::new(
                        AffiliationId::new(pg.number.as_internal_u32().to_string())?,
                        epg.map(|p| p.name.as_str()).unwrap_or(""),
                    ))
                    .valid_votes(pg.total)
                    .build()?,
            );

            for can in &pg.candidate_votes {
                selections.push(
                    ElectionCountSelection::builder()
                        .candidate(CandidateId::new(can.number.as_internal_u32().to_string())?)
                        .valid_votes(can.votes)
                        .build()?,
                );
            }
        }

        Ok(selections)
    }

    fn as_eml_reporting_unit_votes(
        &self,
        committee_session: &CommitteeSession,
        authority_id: &str,
        polling_station: &crate::domain::polling_station::PollingStation,
        results: &crate::domain::data_entry::PollingStationResults,
    ) -> Result<ReportingUnitVotes, EMLError> {
        let mut builder = ReportingUnitVotes::builder()
            .identifier(ReportingUnitIdentifier::new(
                ReportingUnitIdentifierId::new(format!(
                    "{authority_id}::SB{}",
                    polling_station.number
                ))?,
                format!(
                    "{} (postcode: {})",
                    polling_station.name, polling_station.postal_code
                ),
            ))
            .selections(self.as_eml_count_selections(results.political_group_votes())?)
            .eligible_voter_count(polling_station.number_of_voters.unwrap_or(0))
            .candidate_votes_count(results.votes_counts().total_votes_candidates_count)
            .rejected_votes(
                RejectedVotesReason::Blank,
                results.votes_counts().blank_votes_count,
            )
            .rejected_votes(
                RejectedVotesReason::Invalid,
                results.votes_counts().invalid_votes_count,
            )
            .uncounted_votes(
                UncountedVotesReason::ValidPollCards,
                results.voters_counts().poll_card_count,
            )
            .uncounted_votes(
                UncountedVotesReason::ValidProxyCertificates,
                results.voters_counts().proxy_certificate_count,
            )
            .uncounted_votes(
                UncountedVotesReason::AdmittedVoters,
                results.voters_counts().total_admitted_voters_count,
            )
            .uncounted_votes(
                UncountedVotesReason::MoreBallotsCounted,
                results.differences_counts().more_ballots_count,
            )
            .uncounted_votes(
                UncountedVotesReason::FewerBallotsCounted,
                results.differences_counts().fewer_ballots_count,
            );
        builder = add_reporting_unit_investigations(builder, committee_session, results);
        builder.build()
    }
}

fn add_reporting_unit_investigations(
    mut builder: ReportingUnitVotesBuilder,
    committee_session: &CommitteeSession,
    results: &crate::domain::data_entry::PollingStationResults,
) -> ReportingUnitVotesBuilder {
    if !committee_session.is_next_session()
        && let Some(first_session_result) = results.as_cso_first_session()
    {
        if let Some(extra_investigation_other_reason) = first_session_result
            .extra_investigation
            .extra_investigation_other_reason
            .as_bool()
        {
            builder = builder.investigation(
                InvestigationReason::OtherReason,
                extra_investigation_other_reason,
            );
        }

        if let Some(ballots_recounted_extra_investigation) = first_session_result
            .extra_investigation
            .ballots_recounted_extra_investigation
            .as_bool()
        {
            builder = builder.investigation(
                InvestigationReason::PartiallyRecountedBallots,
                ballots_recounted_extra_investigation,
            );
        }

        builder = builder.investigation(
            InvestigationReason::AdmittedVotersReestablished,
            first_session_result.admitted_voters_have_been_recounted(),
        );
    }

    builder
}

pub fn parse_polling_stations_eml_str(
    polling_stations_data: &str,
) -> Result<PollingStations, EMLImportError> {
    Ok(PollingStations::parse_eml(polling_stations_data, EMLParsingMode::Strict).ok()?)
}

pub fn polling_stations_from_eml_str(
    polling_stations_data: &str,
) -> Result<Vec<crate::domain::polling_station::PollingStationRequest>, EMLImportError> {
    let polling_stations = parse_polling_stations_eml_str(polling_stations_data)?;
    polling_stations_from_eml(&polling_stations)
}

pub fn polling_stations_from_eml(
    polling_stations: &PollingStations,
) -> Result<Vec<crate::domain::polling_station::PollingStationRequest>, EMLImportError> {
    let contest = polling_stations
        .election_event
        .election
        .contests
        .first()
        .ok_or(EMLImportError::PollingStationsWithoutContest)?;
    let mut result = vec![];
    for ps in &contest.polling_places {
        let physical_location = &ps.physical_location;
        let pspl = &physical_location.polling_station;
        let locality = &physical_location.address.locality;
        result.push(crate::domain::polling_station::PollingStationRequest {
            name: locality.locality_name.name.clone(),
            number: Some(
                pspl.id
                    .copied_value()?
                    .value()
                    .try_into()
                    .map_err(|_| EMLImportError::NumberOfPollingStationsNotInRange)?,
            ),
            number_of_voters: pspl.data.parse::<u32>().ok(),
            polling_station_type: None,
            address: "".to_string(),
            postal_code: locality
                .postal_code
                .as_ref()
                .map(|pc| &pc.number.number[..])
                .unwrap_or("")
                .to_string(),
            locality: "".to_string(),
        });
    }

    Ok(result)
}

pub fn number_of_voters_from_polling_stations_eml(
    polling_stations: &PollingStations,
) -> Result<u32, EMLImportError> {
    let contest = polling_stations
        .election_event
        .election
        .contests
        .first()
        .ok_or(EMLImportError::PollingStationsWithoutContest)?;
    contest
        .max_votes
        .copied_value()?
        .get()
        .try_into()
        .map_err(|_| EMLImportError::InvalidNumberOfVoters)
}

pub fn polling_stations_eml_matches_election(
    polling_stations: &PollingStations,
    election: &NewElection,
) -> Result<bool, EMLImportError> {
    let identifier = &polling_stations.election_event.election.identifier;
    let election_id = identifier.id.cloned_value()?;
    let election_date = identifier.election_date.copied_value()?.date;
    Ok(election_id.to_raw_value() == election.election_id
        && election_date == election.election_date)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_election_validate_missing_election_domain() {
        let data =
            include_str!("../eml/tests/eml110a_invalid_election_missing_election_domain.eml.xml");
        let res = NewElection::from_eml_str(data).unwrap_err();
        assert!(matches!(res, EMLImportError::MissingElectionDomain))
    }

    #[test]
    fn test_invalid_election_number_of_seats_not_in_range() {
        let data = include_str!(
            "../eml/tests/eml110a_invalid_election_number_of_seats_out_of_range.eml.xml"
        );
        let res = NewElection::from_eml_str(data).unwrap_err();
        assert!(matches!(res, EMLImportError::NumberOfSeatsNotInRange));
    }

    #[test]
    fn test_invalid_election_only_municipal_supported() {
        let data =
            include_str!("../eml/tests/eml110a_invalid_election_only_municipal_supported.eml.xml");
        let res = NewElection::from_eml_str(data).unwrap_err();
        dbg!(&res);
        assert!(matches!(res, EMLImportError::OnlyMunicipalSupported));
    }
}
