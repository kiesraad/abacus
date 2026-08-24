use chrono::{DateTime, Utc};
use pdf_gen::zip::slugify_filename;
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, Type};
use utoipa::ToSchema;

use crate::domain::{
    committee_session::{CommitteeSession, CommitteeSessionId},
    election::{ElectionWithPoliticalGroups, InvalidElectionError, VoteCountingMethod},
    file::FileType::{
        CsbAttachmentPdf, CsbCsvCounts, CsbResultsEml, CsbResultsPdf, CsbTotalCountsEml,
        GsbCsvCounts, GsbOverviewPdf, GsbResultsEml, GsbResultsPdf,
    },
    identifier::id,
    report::structs::{csv_filename, election_filename},
};

id!(FileId);

/// File type
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, ToSchema, Type)]
#[serde(rename_all = "snake_case")]
#[sqlx(rename_all = "snake_case")]
pub enum FileType {
    /// GSB results EML (510b)
    GsbResultsEml,
    /// GSB results PDF (Model Na 31-2 for first session, Model Na 14-2 for next session)
    GsbResultsPdf,
    /// GSB overview PDF for next session (Model P 2a)
    GsbOverviewPdf,
    /// CSB results EML (520)
    CsbResultsEml,
    /// CSB total counts EML (510d)
    CsbTotalCountsEml,
    /// CSB results PDF (Model P 22-2)
    CsbResultsPdf,
    /// CSB attachment PDF (Model P 22-2 Bijlage 1)
    CsbAttachmentPdf,
    /// CSB CSV counts file (OSV4-3)
    CsbCsvCounts,
    /// GSB CSV counts file (OSV4-3)
    GsbCsvCounts,
}

impl FileType {
    pub fn mime_type(&self) -> &'static str {
        use FileType::*;

        match self {
            CsbCsvCounts | GsbCsvCounts => "text/csv",
            GsbResultsEml | CsbResultsEml | CsbTotalCountsEml => "text/xml",
            GsbResultsPdf | GsbOverviewPdf | CsbResultsPdf | CsbAttachmentPdf => "application/pdf",
        }
    }

    pub fn filename(
        &self,
        committee_session: &CommitteeSession,
        election: &ElectionWithPoliticalGroups,
    ) -> Result<String, InvalidElectionError> {
        let filename = match self {
            GsbResultsEml => election_filename(election, "Telling", "eml.xml"),
            GsbResultsPdf => {
                if committee_session.is_next_session() {
                    "Model Na14-2.pdf".to_string()
                } else {
                    match election.counting_method {
                        Some(VoteCountingMethod::CSO) => "Model Na31-2.pdf".to_string(),
                        Some(VoteCountingMethod::DSO) => "Model Na31-1.pdf".to_string(),
                        None => {
                            return Err(InvalidElectionError(
                                "GSB election needs to have a vote counting method".to_string(),
                            ));
                        }
                    }
                }
            }
            GsbOverviewPdf => "Leeg Model P2a.pdf".to_string(),
            CsbResultsEml => election_filename(election, "Resultaat", "eml.xml"),
            CsbTotalCountsEml => election_filename(election, "Totaaltelling", "eml.xml"),
            CsbResultsPdf => "Model P22-2.pdf".to_string(),
            CsbAttachmentPdf => "Model P22-2 bijlage.pdf".to_string(),
            CsbCsvCounts => csv_filename(election),
            GsbCsvCounts => csv_filename(election),
        };
        Ok(slugify_filename(&filename))
    }
}

/// File
#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq, ToSchema, Type, FromRow)]
#[serde(deny_unknown_fields)]
pub struct File {
    pub id: FileId,
    pub data: Vec<u8>,
    pub name: String,
    pub mime_type: String,
    #[schema(value_type = String)]
    pub created_at: DateTime<Utc>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    pub committee_session_id: Option<CommitteeSessionId>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    pub file_type: Option<FileType>,
}
