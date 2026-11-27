use sqlx::SqliteConnection;

use crate::{
    domain::{
        committee_session::{CommitteeSession, CommitteeSessionCreateRequest, CommitteeSessionId},
        election::ElectionId,
    },
    fixtures::builders::FixtureContext,
    repository::committee_session_repo,
};

#[derive(Default)]
pub struct CommitteeSessionBuilder {
    override_id: Option<u32>,
    number: Option<u32>,
}

pub struct CommitteeSessionContext {
    pub committee_session: CommitteeSession,
}

impl CommitteeSessionBuilder {
    #[deprecated = "will be removed once old tests are updated"]
    pub fn override_id(mut self, id: u32) -> Self {
        self.override_id = Some(id);
        self
    }

    pub fn number(mut self, number: u32) -> Self {
        self.number = Some(number);
        self
    }

    pub async fn build(
        self,
        conn: &mut SqliteConnection,
        _fixture_context: &FixtureContext,
        election_id: ElectionId,
    ) -> CommitteeSessionContext {
        let request = CommitteeSessionCreateRequest {
            election_id,
            number: self.number.unwrap(),
        };
        let mut session = committee_session_repo::create(conn, request).await.unwrap();

        if let Some(id) = self.override_id {
            #[expect(deprecated)]
            committee_session_repo::update_id(conn, session.id, CommitteeSessionId::from(id)).await;
            session.id = CommitteeSessionId::from(id);
        }

        CommitteeSessionContext {
            committee_session: session,
        }
    }
}
