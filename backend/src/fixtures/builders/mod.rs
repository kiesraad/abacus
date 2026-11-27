use sqlx::SqliteConnection;
use strum::VariantArray;

use crate::{
    domain::election::ElectionId,
    fixtures::builders::{
        election::ElectionBuilder,
        user::{UserBuilder, UserFixture},
    },
    repository::user_repo::UserId,
};
use std::collections::HashMap;

pub mod committee_session;
pub mod election;
pub mod user;

pub struct FixtureBuilder {
    elections: Vec<election::ElectionBuilder>,
    users: Vec<user::UserBuilder>,
}

pub struct FixtureContext {
    elections: HashMap<ElectionId, election::ElectionContext>,
    users: HashMap<UserId, user::UserContext>,
}

impl FixtureBuilder {
    pub fn new() -> Self {
        Self {
            elections: Vec::new(),
            users: Vec::new(),
        }
    }

    pub fn election(mut self, f: impl FnOnce(ElectionBuilder) -> ElectionBuilder) -> Self {
        self.elections.push(f(ElectionBuilder::new()));
        self
    }

    pub fn user(mut self, f: impl FnOnce(UserBuilder) -> UserBuilder) -> Self {
        self.users.push(f(UserBuilder::new()));
        self
    }

    pub fn user_fixtures(mut self) -> Self {
        for fixture in UserFixture::VARIANTS {
            self = self.user(|b| b.fixture(fixture));
        }
        self
    }

    pub async fn build(self, conn: &mut SqliteConnection) -> FixtureContext {
        let mut context = FixtureContext {
            users: HashMap::new(),
            elections: HashMap::new(),
        };

        for user_builder in self.users {
            user_builder.build(conn, &mut context).await;
        }

        for election_builder in self.elections {
            election_builder.build(conn, &mut context).await;
        }

        context
    }
}
