use sqlx::SqliteConnection;

use crate::{
    domain::polling_station::{
        PollingStation, PollingStationId, PollingStationNumber, PollingStationRequest,
    },
    fixtures::builders::{
        committee_session::CommitteeSessionScope,
        data_entry::{DataEntryBuilder, DataEntryContext},
    },
    repository::polling_station_repo,
};

#[derive(Default)]
pub struct PollingStationBuilder {
    override_id: Option<u32>,
    number: Option<PollingStationNumber>,
    name: Option<String>,
    data_entry: Option<DataEntryBuilder>,
}

pub struct PollingStationContext {
    pub polling_station: PollingStation,
    pub data_entry: DataEntryContext,
}

impl PollingStationBuilder {
    #[deprecated = "will be removed once old tests are updated"]
    pub fn override_id(mut self, id: u32) -> Self {
        self.override_id = Some(id);
        self
    }

    pub fn data_entry(mut self, f: impl FnOnce(DataEntryBuilder) -> DataEntryBuilder) -> Self {
        self.data_entry = Some(f(DataEntryBuilder::default()));
        self
    }

    pub fn number(mut self, number: PollingStationNumber) -> Self {
        self.number = Some(number);
        self
    }

    pub fn name(mut self, name: &str) -> Self {
        self.name = Some(name.to_string());
        self
    }

    pub async fn build(
        self,
        conn: &mut SqliteConnection,
        parent: &CommitteeSessionScope<'_>,
    ) -> PollingStationContext {
        let id = polling_station_repo::create(
            conn,
            parent.parent.election.id,
            PollingStationRequest {
                name: self.name.unwrap(),
                number: Some(self.number.unwrap()),
                number_of_voters: None,
                polling_station_type: None,
                address: "".to_string(),
                postal_code: "".to_string(),
                locality: "".to_string(),
            },
        )
        .await
        .unwrap();

        // TODO: polling_station_repo::create should return the created object
        let mut polling_station = polling_station_repo::get(conn, id)
            .await
            .unwrap()
            .into_polling_station();

        if let Some(id) = self.override_id {
            #[expect(deprecated)]
            polling_station_repo::update_id(conn, polling_station.id, PollingStationId::from(id))
                .await;
            polling_station.id = PollingStationId::from(id);
        }

        let data_entry_id = polling_station_repo::create_data_entry(conn, polling_station.id)
            .await
            .unwrap();
        let data_entry = if let Some(data_entry_builder) = self.data_entry {
            data_entry_builder.build(conn, parent, data_entry_id).await
        } else {
            DataEntryContext { data_entry_id }
        };

        PollingStationContext {
            polling_station,
            data_entry,
        }
    }
}
