use sqlx::SqliteConnection;

use crate::{
    domain::{
        committee_session::CommitteeSession,
        data_entry::{
            ClientState, DataEntryId, DataEntryStatus, DataEntryStatusName, DataEntryUpdate,
        },
        election::ElectionWithPoliticalGroups,
        results::Results,
    },
    fixtures::builders::committee_session::CommitteeSessionScope,
    repository::{data_entry_repo, user_repo::UserId},
};

pub struct DataEntryContext {
    pub data_entry_id: DataEntryId,
}

#[derive(Default)]
pub struct DataEntryBuilder {
    state: Option<DataEntryStatusName>,
    first_entry_username: Option<String>,
    second_entry_username: Option<String>,
    first_results: Option<Results>,
    second_results: Option<Results>,
}

impl DataEntryBuilder {
    pub fn state(mut self, state: DataEntryStatusName) -> Self {
        self.state = Some(state);
        self
    }

    pub fn first_entry_user(mut self, username: &str) -> Self {
        self.first_entry_username = Some(username.into());
        self
    }

    pub fn second_entry_user(mut self, username: &str) -> Self {
        self.second_entry_username = Some(username.into());
        self
    }

    pub fn first_results(mut self, results: Results) -> Self {
        self.first_results = Some(results);
        self
    }

    pub fn second_results(mut self, results: Results) -> Self {
        self.second_results = Some(results);
        self
    }

    pub fn results(mut self, results: Results) -> Self {
        self.first_results = Some(results.clone());
        self.second_results = Some(results);
        self
    }

    pub async fn build(
        self,
        conn: &mut SqliteConnection,
        parent: &CommitteeSessionScope<'_>,
        data_entry_id: DataEntryId,
    ) -> DataEntryContext {
        let fixture_context = parent.parent.parent;
        let first_user_id = fixture_context
            .get_user(&self.first_entry_username.unwrap())
            .user
            .id();
        let second_user_id = fixture_context
            .get_user(&self.second_entry_username.unwrap())
            .user
            .id();

        let state = get_state(
            parent.parent.election,
            parent.committee_session,
            self.state.unwrap(),
            first_user_id,
            second_user_id,
            self.first_results.unwrap(),
            self.second_results.unwrap(),
        );

        data_entry_repo::update(conn, data_entry_id, &state)
            .await
            .unwrap();

        DataEntryContext { data_entry_id }
    }
}

fn get_state(
    election: &ElectionWithPoliticalGroups,
    committee_session: &CommitteeSession,
    requested_state: DataEntryStatusName,
    first_user_id: UserId,
    second_user_id: UserId,
    first_results: Results,
    second_results: Results,
) -> DataEntryStatus {
    let state = DataEntryStatus::Empty;

    let initial_results = Results::new(election, committee_session, None);

    match requested_state {
        DataEntryStatusName::Empty => state,
        DataEntryStatusName::Definitive => state
            .claim_first_entry(first_user_id, initial_results.clone())
            .unwrap()
            .update_first_entry(DataEntryUpdate {
                client_state: ClientState::default(),
                entry: first_results,
                progress: 100,
                user_id: first_user_id,
            })
            .unwrap()
            .finalise_first_entry(election, first_user_id)
            .unwrap()
            .claim_second_entry(second_user_id, initial_results)
            .unwrap()
            .update_second_entry(DataEntryUpdate {
                client_state: ClientState::default(),
                entry: second_results,
                progress: 100,
                user_id: second_user_id,
            })
            .unwrap()
            .finalise_second_entry(election, second_user_id)
            .unwrap(),
        _ => unimplemented!("Requested state {:?} is not implemented", requested_state),
    }
}
