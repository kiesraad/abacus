use serde::{Deserialize, Serialize};

use crate::{
    election::Election,
    polling_station::{PoliticalGroupVotes, PollingStation, VotersCounts, VotesCounts},
};

#[derive(Serialize, Deserialize)]
pub struct ModelNa31_2Input {
    pub election: Election,
    pub summary: ModelNa31_2Summary,
    pub polling_stations: Vec<PollingStation>,
}

#[derive(Serialize, Deserialize)]
pub struct ModelNa31_2Summary {
    pub voters_counts: VotersCounts,
    pub votes_counts: VotesCounts,
    pub differences_counts: SummaryDifferencesCounts,
    pub recounted_polling_stations: Vec<String>,
    pub political_group_votes: Vec<PoliticalGroupVotes>,
}

impl ModelNa31_2Summary {
    pub fn zero() -> ModelNa31_2Summary {
        ModelNa31_2Summary {
            voters_counts: VotersCounts {
                poll_card_count: 0,
                proxy_certificate_count: 0,
                voter_card_count: 0,
                total_admitted_voters_count: 0,
            },
            votes_counts: VotesCounts {
                votes_candidates_counts: 0,
                blank_votes_count: 0,
                invalid_votes_count: 0,
                total_votes_cast_count: 0,
            },
            differences_counts: SummaryDifferencesCounts::zero(),
            recounted_polling_stations: vec![],
            political_group_votes: vec![],
        }
    }
}

#[derive(Serialize, Deserialize)]
pub struct SummaryDifferencesCounts {
    pub more_ballots_count: SumCount,
    pub fewer_ballots_count: SumCount,
    pub unreturned_ballots_count: SumCount,
    pub too_few_ballots_handed_out_count: SumCount,
    pub too_many_ballots_handed_out_count: SumCount,
    pub other_explanation_count: SumCount,
    pub no_explanation_count: SumCount,
}

impl SummaryDifferencesCounts {
    pub fn zero() -> SummaryDifferencesCounts {
        SummaryDifferencesCounts {
            more_ballots_count: SumCount::zero(),
            fewer_ballots_count: SumCount::zero(),
            unreturned_ballots_count: SumCount::zero(),
            too_few_ballots_handed_out_count: SumCount::zero(),
            too_many_ballots_handed_out_count: SumCount::zero(),
            other_explanation_count: SumCount::zero(),
            no_explanation_count: SumCount::zero(),
        }
    }
}

#[derive(Serialize, Deserialize)]
pub struct SumCount {
    pub count: u32,
    pub polling_stations: Vec<String>,
}

impl SumCount {
    pub fn zero() -> SumCount {
        SumCount {
            count: 0,
            polling_stations: vec![],
        }
    }
}
