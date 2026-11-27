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

#[derive(Default)]
pub struct FixtureBuilder {
    elections: Vec<election::ElectionBuilder>,
    users: Vec<user::UserBuilder>,
}

pub struct FixtureContext {
    elections: HashMap<ElectionId, election::ElectionContext>,
    users: HashMap<UserId, user::UserContext>,
}

impl FixtureBuilder {
    pub fn election(mut self, f: impl FnOnce(ElectionBuilder) -> ElectionBuilder) -> Self {
        self.elections.push(f(ElectionBuilder::default()));
        self
    }

    pub fn user(mut self, f: impl FnOnce(UserBuilder) -> UserBuilder) -> Self {
        self.users.push(f(UserBuilder::default()));
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
            let user_context = user_builder.build(conn, &context).await;
            context.users.insert(user_context.user.id(), user_context);
        }

        for election_builder in self.elections {
            let election_context = election_builder.build(conn, &context).await;
            context
                .elections
                .insert(election_context.election.id, election_context);
        }

        context
    }
}
