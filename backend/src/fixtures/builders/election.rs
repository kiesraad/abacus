use std::collections::HashMap;

use chrono::NaiveDate;
use sqlx::SqliteConnection;

use crate::{
    domain::{
        committee_session::CommitteeSessionId,
        election::{
            Candidate, CandidateGender, CandidateNumber, CommitteeCategory, CommitteeDistrict,
            ElectionCategory, ElectionDomain, ElectionWithPoliticalGroups, NewElection, PGNumber,
            RegisteredPoliticalGroup, VoteCountingMethod,
        },
    },
    fixtures::builders::{
        FixtureContext,
        committee_session::{CommitteeSessionBuilder, CommitteeSessionContext},
    },
    repository::election_repo,
};

pub struct ElectionBuilder {
    name: Option<String>,
    committee_category: Option<CommitteeCategory>,
    counting_method: Option<VoteCountingMethod>,
    election_category: Option<ElectionCategory>,
    number_of_seats: Option<u32>,
    political_groups: Vec<RegisteredPoliticalGroup>,
    committee_sessions: Vec<CommitteeSessionBuilder>,
}

pub struct ElectionContext {
    pub election: ElectionWithPoliticalGroups,
    pub committee_sessions: HashMap<CommitteeSessionId, CommitteeSessionContext>,
}

impl ElectionBuilder {
    pub fn new() -> Self {
        Self {
            name: None,
            committee_category: None,
            counting_method: None,
            election_category: None,
            number_of_seats: None,
            political_groups: vec![],
            committee_sessions: vec![],
        }
    }

    pub fn committee_session(
        mut self,
        f: impl FnOnce(CommitteeSessionBuilder) -> CommitteeSessionBuilder,
    ) -> Self {
        self.committee_sessions
            .push(f(CommitteeSessionBuilder::new()));
        self
    }

    pub fn fixture(self, election_fixture: &ElectionFixture) -> Self {
        use ElectionFixture::*;
        match election_fixture {
            Election6NoPollingStations => {
                let political_group = |number: u32, name: &str| RegisteredPoliticalGroup {
                    number: PGNumber::from(number),
                    registered_name: name.to_string(),
                    candidates: vec![
                        Candidate {
                            number: CandidateNumber::from(1),
                            initials: "A.".to_string(),
                            first_name: Some("Alice".to_string()),
                            last_name_prefix: None,
                            last_name: "Foo".to_string(),
                            locality: "Klein Dorp".to_string(),
                            country_code: None,
                            gender: Some(CandidateGender::Female),
                        },
                        Candidate {
                            number: CandidateNumber::from(2),
                            initials: "C.".to_string(),
                            first_name: Some("Charlie".to_string()),
                            last_name_prefix: None,
                            last_name: "Doe".to_string(),
                            locality: "Klein Dorp".to_string(),
                            country_code: None,
                            gender: None,
                        },
                    ],
                };

                self.name("Gemeenteraad Klein Dorp 2024")
                    .committee_category(CommitteeCategory::GSB)
                    .counting_method(VoteCountingMethod::CSO)
                    .election_category(ElectionCategory::Municipal)
                    .number_of_seats(29)
                    // .election_id("GR2024_KleinDorp")
                    // .location("Klein Dorp")
                    // .authority_id("0123")
                    // .authority_name("Klein Dorp")
                    // .authority_region("Klein Dorp")
                    // .domain(Some(ElectionDomain {
                    //     id: Some("0123".to_string()),
                    //     name: "Klein Dorp".to_string(),
                    // }))
                    // .number_of_voters(2500)
                    // .election_date(NaiveDate::from_ymd_opt(2024, 12, 31).unwrap())
                    // .nomination_date(NaiveDate::from_ymd_opt(2024, 12, 1).unwrap())
                    .political_groups(vec![
                        political_group(1, "Political Group A"),
                        political_group(2, "Political Group B"),
                    ])
                    .committee_session(|b| b)
            }
        }
    }

    pub fn name(mut self, name: &str) -> Self {
        self.name = Some(name.to_string());
        self
    }

    pub fn committee_category(mut self, committee_category: CommitteeCategory) -> Self {
        self.committee_category = Some(committee_category);
        self
    }

    pub fn counting_method(mut self, counting_method: VoteCountingMethod) -> Self {
        self.counting_method = Some(counting_method);
        self
    }

    pub fn election_category(mut self, election_category: ElectionCategory) -> Self {
        self.election_category = Some(election_category);
        self
    }

    pub fn number_of_seats(mut self, number_of_seats: u32) -> Self {
        self.number_of_seats = Some(number_of_seats);
        self
    }

    // TODO: should also be a builder
    pub fn political_groups(mut self, political_groups: Vec<RegisteredPoliticalGroup>) -> Self {
        self.political_groups = political_groups;
        self
    }


    pub async fn build(self, conn: &mut SqliteConnection, context: &mut FixtureContext) {
        // TODO: Add check if combination of properties like categories/counting method are correct
        let name = self.name.unwrap();

        let election = election_repo::create(
            conn,
            NewElection {
                name: name.clone(),
                official_name: name,
                committee_category: self.committee_category.unwrap(),
                counting_method: self.counting_method,
                election_id: "".to_string(),
                location: "".to_string(),
                authority_id: "".to_string(),
                authority_name: "".to_string(),
                authority_region: "".to_string(),
                district: CommitteeDistrict::None,
                domain: Some(ElectionDomain {
                    id: Some("".to_string()),
                    name: "".to_string(),
                }),
                category: self.election_category.unwrap(),
                // TODO: when TK/PS2 is implemented, this should also be based on district
                sub_category: self
                    .election_category
                    .unwrap()
                    .sub_category(self.number_of_seats.unwrap()),
                number_of_seats: self.number_of_seats.unwrap(),
                number_of_voters: 1337,
                election_date: chrono::NaiveDate::from_ymd_opt(2024, 6, 1).unwrap(),
                nomination_date: chrono::NaiveDate::from_ymd_opt(2024, 5, 1).unwrap(),
                political_groups: vec![],
            },
        )
        .await
        .unwrap();

        context.elections.insert(
            election.id,
            ElectionContext {
                election: election.clone(),
                committee_sessions: HashMap::new(),
            },
        );

        for builder in self.committee_sessions {
            builder.build(conn, context, &election.id).await;
        }
    }
}

pub enum ElectionFixture {
    Election6NoPollingStations,
}
