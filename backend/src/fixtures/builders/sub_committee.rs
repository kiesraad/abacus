use sqlx::SqliteConnection;

use crate::{
    domain::{
        election::CommitteeCategory,
        sub_committee::{
            NewSubCommittee, SubCommitteeFirstSession, SubCommitteeId, SubCommitteeNumber,
        },
    },
    fixtures::builders::{
        committee_session::CommitteeSessionScope,
        data_entry::{DataEntryBuilder, DataEntryContext},
    },
    repository::sub_committee_repo,
    service,
};

#[derive(Default)]
pub struct SubCommitteeBuilder {
    override_id: Option<u32>,
    number: Option<SubCommitteeNumber>,
    category: Option<CommitteeCategory>,
    name: Option<String>,
    data_entry: Option<DataEntryBuilder>,
}

pub struct SubCommitteeContext {
    pub sub_committee: SubCommitteeFirstSession,
    pub data_entry: DataEntryContext,
}

impl SubCommitteeBuilder {
    #[deprecated = "will be removed once old tests are updated"]
    pub fn override_id(mut self, id: u32) -> Self {
        self.override_id = Some(id);
        self
    }

    pub fn data_entry(mut self, f: impl FnOnce(DataEntryBuilder) -> DataEntryBuilder) -> Self {
        self.data_entry = Some(f(DataEntryBuilder::default()));
        self
    }

    pub fn number(mut self, number: SubCommitteeNumber) -> Self {
        self.number = Some(number);
        self
    }

    pub fn category(mut self, category: CommitteeCategory) -> Self {
        self.category = Some(category);
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
    ) -> SubCommitteeContext {
        let mut sub_committee = service::create_sub_committee(
            conn,
            parent.committee_session.id,
            NewSubCommittee {
                number: self.number.unwrap(),
                name: self.name.unwrap(),
                category: self.category.unwrap(),
                authority_id: "".to_string(),
                authority_name: "".to_string(),
            },
        )
        .await
        .unwrap();

        if let Some(id) = self.override_id {
            #[expect(deprecated)]
            sub_committee_repo::update_id(conn, sub_committee.id, SubCommitteeId::from(id)).await;
            sub_committee.id = SubCommitteeId::from(id);
        }

        let data_entry_id = sub_committee.data_entry_id;
        let data_entry = if let Some(data_entry_builder) = self.data_entry {
            data_entry_builder.build(conn, parent, data_entry_id).await
        } else {
            DataEntryContext { data_entry_id }
        };

        SubCommitteeContext {
            sub_committee,
            data_entry,
        }
    }
}
