use sqlx::SqliteConnection;

use crate::{
    domain::election::ElectionId,
    fixtures::builders::{election::ElectionBuilder, user::UserBuilder},
    repository::user_repo::UserId,
};
use std::collections::HashMap;

pub mod committee_session;
pub mod data_entry;
pub mod election;
pub mod polling_station;
pub mod predefined;
pub mod sub_committee;
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
        for user in predefined::ALL_USERS {
            self = self.user(user);
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

impl FixtureContext {
    pub fn get_user(&self, username: &str) -> &user::UserContext {
        self.users
            .values()
            .find(|u| u.user.username() == username)
            .unwrap()
    }

    // // Only 1, otherwise error
    // let election = context.single::<Election>();

    // // Only 1 result, otherwise error
    // let specific_election =
    //     context.find::<Election>(|e| e.committee_category == CommitteeCategory::CSB);

    // // List of multiple results
    // let specific_election =
    //     context.filter::<Election>(|e| e.committee_category == CommitteeCategory::CSB);

    // // Bonus: wrapper type
    // // Returns ElectionContext
    // let election = context.single::<Election>();
    // let session = election.single::<CommitteeSession>();
    // let entries = session.filter::<DataEntry>(|e| e);

    // // Scratchpad
    // trait WrapperContext<T> {
    //     fn single(&self) -> T;
    //     fn find<F>(&self, f: F) -> Option<T>
    //     where
    //         F: Fn(&T) -> bool;
    //     fn filter<F>(&self, f: F) -> Vec<T>
    //     where
    //         F: Fn(&T) -> bool;
    // }

    // struct ElectionContext {
    //     context: FixtureContext,
    // }

    // impl<T> WrapperContext<T> for ElectionContext {
    //     fn single(&self) -> T {
    //         self.context.single::<T>().unwrap()
    //     }

    //     fn find<F>(&self, f: F) -> Option<T>
    //     where
    //         F: Fn(&T) -> bool,
    //     {
    //         self.context.find::<T>(f)
    //     }

    //     fn filter<F>(&self, f: F) -> Vec<T>
    //     where
    //         F: Fn(&T) -> bool,
    //     {
    //         self.context.filter::<T>(f)
    //     }
    // }
}
