use crate::domain::{
    data_entry::{
        CandidateVotes, ExtraInvestigation, PoliticalGroupCandidateVotes, PoliticalGroupTotalVotes,
        PollingStationResults, VotersCounts, VotesCounts, YesNo,
    },
    validation::FieldPath,
};

pub trait Compare {
    fn compare(&self, first_entry: &Self, different_fields: &mut Vec<String>, path: &FieldPath);
}

impl Compare for PollingStationResults {
    fn compare(&self, first_entry: &Self, different_fields: &mut Vec<String>, path: &FieldPath) {
        match (self, first_entry) {
            (
                PollingStationResults::CSOFirstSession(s),
                PollingStationResults::CSOFirstSession(f),
            ) => s.compare(f, different_fields, path),
            (
                PollingStationResults::CSONextSession(s),
                PollingStationResults::CSONextSession(f),
            ) => s.compare(f, different_fields, path),
            _ => {
                different_fields.push(path.to_string());
            }
        }
    }
}

impl Compare for ExtraInvestigation {
    fn compare(&self, first_entry: &Self, different_fields: &mut Vec<String>, path: &FieldPath) {
        self.extra_investigation_other_reason.compare(
            &first_entry.extra_investigation_other_reason,
            different_fields,
            &path.field("extra_investigation_other_reason"),
        );

        self.ballots_recounted_extra_investigation.compare(
            &first_entry.ballots_recounted_extra_investigation,
            different_fields,
            &path.field("ballots_recounted_extra_investigation"),
        );
    }
}

impl Compare for YesNo {
    fn compare(&self, first_entry: &Self, different_fields: &mut Vec<String>, path: &FieldPath) {
        if self != first_entry {
            different_fields.push(path.to_string());
        }
    }
}

impl Compare for bool {
    fn compare(
        &self,
        first_entry: &Self,
        different_fields: &mut Vec<String>,
        field_name: &FieldPath,
    ) {
        if self != first_entry {
            different_fields.push(field_name.to_string());
        }
    }
}

impl Compare for VotersCounts {
    fn compare(&self, first_entry: &Self, different_fields: &mut Vec<String>, path: &FieldPath) {
        // compare all counts
        self.poll_card_count.compare(
            &first_entry.poll_card_count,
            different_fields,
            &path.field("poll_card_count"),
        );
        self.proxy_certificate_count.compare(
            &first_entry.proxy_certificate_count,
            different_fields,
            &path.field("proxy_certificate_count"),
        );
        self.total_admitted_voters_count.compare(
            &first_entry.total_admitted_voters_count,
            different_fields,
            &path.field("total_admitted_voters_count"),
        );
    }
}

impl Compare for VotesCounts {
    fn compare(&self, first_entry: &Self, different_fields: &mut Vec<String>, path: &FieldPath) {
        self.political_group_total_votes.compare(
            &first_entry.political_group_total_votes,
            different_fields,
            &path.field("political_group_total_votes"),
        );

        // compare all counts
        self.total_votes_candidates_count.compare(
            &first_entry.total_votes_candidates_count,
            different_fields,
            &path.field("total_votes_candidates_count"),
        );
        self.blank_votes_count.compare(
            &first_entry.blank_votes_count,
            different_fields,
            &path.field("blank_votes_count"),
        );
        self.invalid_votes_count.compare(
            &first_entry.invalid_votes_count,
            different_fields,
            &path.field("invalid_votes_count"),
        );
        self.total_votes_cast_count.compare(
            &first_entry.total_votes_cast_count,
            different_fields,
            &path.field("total_votes_cast_count"),
        );
    }
}

impl Compare for Vec<PoliticalGroupTotalVotes> {
    fn compare(&self, first_entry: &Self, different_fields: &mut Vec<String>, path: &FieldPath) {
        // compare total of each political group
        for (i, pgv) in self.iter().enumerate() {
            pgv.total.compare(
                &first_entry[i].total,
                different_fields,
                &path.index(i).field("total"),
            );
        }
    }
}

impl Compare for Vec<PoliticalGroupCandidateVotes> {
    fn compare(&self, first_entry: &Self, different_fields: &mut Vec<String>, path: &FieldPath) {
        // compare each political group
        for (i, pgv) in self.iter().enumerate() {
            pgv.compare(&first_entry[i], different_fields, &path.index(i));
        }
    }
}

impl Compare for PoliticalGroupCandidateVotes {
    fn compare(&self, first_entry: &Self, different_fields: &mut Vec<String>, path: &FieldPath) {
        // compare all candidates
        for (i, cv) in self.candidate_votes.iter().enumerate() {
            cv.compare(
                &first_entry.candidate_votes[i],
                different_fields,
                &path.field("candidate_votes").index(i),
            );
        }

        // compare the total number of votes
        self.total
            .compare(&first_entry.total, different_fields, &path.field("total"));
    }
}

impl Compare for CandidateVotes {
    fn compare(&self, first_entry: &Self, different_fields: &mut Vec<String>, path: &FieldPath) {
        self.votes
            .compare(&first_entry.votes, different_fields, &path.field("votes"))
    }
}
