use sqlx::SqliteConnection;

use crate::{
    domain::{
        committee_session::{CommitteeSession, CommitteeSessionCreateRequest, CommitteeSessionId},
        committee_session_status::CommitteeSessionStatus,
    },
    fixtures::builders::{
        election::ElectionScope,
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
    polling_stations: Vec<PollingStationContext>,
    sub_committees: Vec<SubCommitteeContext>,
}

impl CommitteeSessionContext {
    pub fn polling_stations(&self) -> impl Iterator<Item = &PollingStationContext> {
        self.polling_stations.iter()
    }

    pub fn sub_committees(&self) -> impl Iterator<Item = &SubCommitteeContext> {
        self.sub_committees.iter()
    }
}

pub struct CommitteeSessionScope<'a> {
    pub parent: &'a ElectionScope<'a>,
    pub committee_session: &'a CommitteeSession,
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
        parent: &ElectionScope<'_>,
    ) -> CommitteeSessionContext {
        let status = self.status.unwrap();

        let request = CommitteeSessionCreateRequest {
            election_id: parent.election.id,
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

        let scope = CommitteeSessionScope {
            parent,
            committee_session: &session,
        };

        let mut polling_stations = Vec::new();
        for builder in self.polling_stations {
            polling_stations.push(builder.build(conn, &scope).await);
        }

        let mut sub_committees = Vec::new();
        for builder in self.sub_committees {
            sub_committees.push(builder.build(conn, &scope).await);
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
