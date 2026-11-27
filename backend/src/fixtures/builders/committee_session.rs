use std::collections::HashMap;

use sqlx::SqliteConnection;

use crate::{
    domain::{
        committee_session::{CommitteeSession, CommitteeSessionCreateRequest, CommitteeSessionId},
        committee_session_status::CommitteeSessionStatus,
        election::ElectionId,
        polling_station::PollingStationId,
        sub_committee::SubCommitteeId,
    },
    fixtures::builders::{
        FixtureContext,
        polling_station::{PollingStationBuilder, PollingStationContext},
        sub_committee::{SubCommitteeBuilder, SubCommitteeContext},
    },
    infra::audit_log::AuditService,
    repository::committee_session_repo,
    service::change_committee_session_status,
};

#[derive(Default)]
pub struct CommitteeSessionBuilder {
    override_id: Option<u32>,
    number: Option<u32>,
    status: Option<CommitteeSessionStatus>,
    polling_stations: Vec<PollingStationBuilder>,
    sub_committees: Vec<SubCommitteeBuilder>,
}

pub struct CommitteeSessionContext {
    pub committee_session: CommitteeSession,
    pub polling_stations: HashMap<PollingStationId, PollingStationContext>,
    pub sub_committees: HashMap<SubCommitteeId, SubCommitteeContext>,
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

    pub fn status(mut self, status: CommitteeSessionStatus) -> Self {
        self.status = Some(status);
        self
    }

    pub fn polling_station(
        mut self,
        f: impl FnOnce(PollingStationBuilder) -> PollingStationBuilder,
    ) -> Self {
        let number = u32::try_from(self.polling_stations.len()).unwrap() + 1;
        self.polling_stations
            .push(f(PollingStationBuilder::default().number(number)));
        self
    }

    pub fn sub_committee(
        mut self,
        f: impl FnOnce(SubCommitteeBuilder) -> SubCommitteeBuilder,
    ) -> Self {
        let number = u32::try_from(self.sub_committees.len()).unwrap() + 1;
        self.sub_committees
            .push(f(SubCommitteeBuilder::default().number(number)));
        self
    }

    pub async fn build(
        self,
        conn: &mut SqliteConnection,
        fixture_context: &FixtureContext,
        election_id: ElectionId,
    ) -> CommitteeSessionContext {
        let status = self.status.unwrap();

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

        // TODO: could be improved to check which one is actually needed
        if !self.polling_stations.is_empty() && !self.sub_committees.is_empty() {
            panic!("Should have either polling stations or sub committees, not both");
        }

        let mut polling_stations = HashMap::new();
        for builder in self.polling_stations {
            let ps = builder.build(conn, fixture_context, election_id).await;
            polling_stations.insert(ps.polling_station.id, ps);
        }

        let mut sub_committees = HashMap::new();
        for builder in self.sub_committees {
            let sc = builder.build(conn, fixture_context, session.id).await;
            sub_committees.insert(sc.sub_committee.id, sc);
        }

        if status > CommitteeSessionStatus::Created {
            to_status(conn, session.id, CommitteeSessionStatus::InPreparation).await;
        }

        if status > CommitteeSessionStatus::InPreparation {
            to_status(conn, session.id, CommitteeSessionStatus::DataEntry).await;
        }

        // Go to the requested status
        to_status(conn, session.id, status).await;

        CommitteeSessionContext {
            committee_session: session,
            polling_stations,
            sub_committees,
        }
    }
}

async fn to_status(
    conn: &mut SqliteConnection,
    session_id: CommitteeSessionId,
    status: CommitteeSessionStatus,
) {
    change_committee_session_status(
        conn,
        session_id,
        status,
        // TODO: make AuditService::noop()?
        AuditService::new_anon(),
    )
    .await
    .unwrap();
}
