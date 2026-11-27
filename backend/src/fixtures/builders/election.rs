use sqlx::SqliteConnection;

use crate::{
    domain::election::{
        CommitteeCategory, CommitteeDistrict, ElectionCategory, ElectionDomain, ElectionId,
        ElectionWithPoliticalGroups, NewElection, RegisteredPoliticalGroup, VoteCountingMethod,
    },
    fixtures::builders::{
        FixtureContext,
        committee_session::{CommitteeSessionBuilder, CommitteeSessionContext},
    },
    repository::election_repo,
};

#[derive(Default)]
pub struct ElectionBuilder {
    override_id: Option<u32>,
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
    committee_sessions: Vec<CommitteeSessionContext>,
}

impl ElectionContext {
    pub fn committee_sessions(&self) -> impl Iterator<Item = &CommitteeSessionContext> {
        self.committee_sessions.iter()
    }
}

pub struct ElectionScope<'a> {
    pub parent: &'a FixtureContext,
    pub election: &'a ElectionWithPoliticalGroups,
}

impl ElectionBuilder {
    #[deprecated = "will be removed once old tests are updated"]
    pub fn override_id(mut self, id: u32) -> Self {
        self.override_id = Some(id);
        self
    }

    pub fn committee_session(
        mut self,
        f: impl FnOnce(CommitteeSessionBuilder) -> CommitteeSessionBuilder,
    ) -> Self {
        let number = u32::try_from(self.committee_sessions.len()).unwrap() + 1;
        self.committee_sessions
            .push(f(CommitteeSessionBuilder::default().number(number)));
        self
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

    pub async fn build(
        self,
        conn: &mut SqliteConnection,
        fixture_context: &FixtureContext,
    ) -> ElectionContext {
        // TODO: Add check if combination of properties like categories/counting method are correct
        let name = self.name.unwrap();

        let mut election = election_repo::create(
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
                political_groups: self.political_groups,
            },
        )
        .await
        .unwrap();

        if let Some(id) = self.override_id {
            #[expect(deprecated)]
            election_repo::update_id(conn, election.id, ElectionId::from(id)).await;
            election.id = ElectionId::from(id);
        }

        let scope = ElectionScope {
            parent: fixture_context,
            election: &election,
        };
        let mut committee_sessions = Vec::new();
        for builder in self.committee_sessions {
            committee_sessions.push(builder.build(conn, &scope).await);
        }

        ElectionContext {
            election,
            committee_sessions,
        }
    }
}
