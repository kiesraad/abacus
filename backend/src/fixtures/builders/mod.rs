use sqlx::SqliteConnection;

use crate::fixtures::builders::{election::ElectionBuilder, user::UserBuilder};

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
    elections: Vec<election::ElectionContext>,
    users: Vec<user::UserContext>,
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
            users: Vec::new(),
            elections: Vec::new(),
        };

        for user_builder in self.users {
            let user_context = user_builder.build(conn, &context).await;
            context.users.push(user_context);
        }

        for election_builder in self.elections {
            let election_context = election_builder.build(conn, &context).await;
            context.elections.push(election_context);
        }

        context
    }
}

impl FixtureContext {
    pub fn get_user(&self, username: &str) -> &user::UserContext {
        self.users
            .iter()
            .find(|u| u.user.username() == username)
            .unwrap_or_else(|| panic!("fixture user {username:?} not found"))
    }

    /// Elections in declaration order
    pub fn elections(&self) -> impl Iterator<Item = &election::ElectionContext> {
        self.elections.iter()
    }
}

/// Use with the context accessors, e.g. `ctx.elections().single().committee_sessions().single()`.
/// For several items use the standard `Iterator::find` / `Iterator::filter`.
pub trait Single: Iterator + Sized {
    /// Returns the only item; panics if there are none or more than one
    fn single(mut self) -> Self::Item {
        let item = self.next().expect("expected exactly one item, found none");
        assert!(
            self.next().is_none(),
            "expected exactly one item, found more"
        );
        item
    }
}

impl<I: Iterator> Single for I {}

#[cfg(test)]
mod tests {
    use super::Single;

    #[test]
    fn single_returns_only_item() {
        assert_eq!([1].iter().single(), &1);
    }

    #[test]
    #[should_panic(expected = "found none")]
    fn single_panics_on_empty() {
        std::iter::empty::<u32>().single();
    }

    #[test]
    #[should_panic(expected = "found more")]
    fn single_panics_on_multiple() {
        [1, 2].iter().single();
    }
}
