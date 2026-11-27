use sqlx::SqliteConnection;

use crate::{
    domain::{
        committee_session::{CommitteeSession, CommitteeSessionCreateRequest},
        election::ElectionId,
    },
    fixtures::builders::FixtureContext,
    repository::committee_session_repo,
};

pub struct CommitteeSessionBuilder {}

pub struct CommitteeSessionContext {
    pub committee_session: CommitteeSession,
}

impl CommitteeSessionBuilder {
    pub fn new() -> Self {
        Self {}
    }

    pub async fn build(
        self,
        conn: &mut SqliteConnection,
        context: &mut FixtureContext,
        election_id: &ElectionId,
    ) {
        let election_context = context.elections.get_mut(election_id).unwrap();

        let request = CommitteeSessionCreateRequest {
            election_id: election_id.clone(),
            number: (election_context.committee_sessions.len() + 1) as u32,
        };
        let session = committee_session_repo::create(conn, request).await.unwrap();

        election_context.committee_sessions.insert(
            session.id,
            CommitteeSessionContext {
                committee_session: session,
            },
        );
    }
}
