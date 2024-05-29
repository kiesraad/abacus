use axum::extract::Path;
use axum::Json;
use chrono::NaiveDate;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use crate::APIError;

pub use self::structs::*;

pub mod structs;

/// Election details response
#[derive(Serialize, Deserialize, ToSchema, Debug)]
pub struct ElectionDetailsResponse {
    pub election: Election,
}

/// Get election details including its candidate list
#[utoipa::path(
        get,
        path = "/api/elections/{election_id}",
        responses(
            (status = 200, description = "Election", body = ElectionDetailsResponse),
        ),
        params(
            ("election_id" = u32, description = "Election database id"),
        ),
    )]
pub async fn election_details(
    Path(id): Path<u32>,
) -> Result<Json<ElectionDetailsResponse>, APIError> {
    Ok(Json(ElectionDetailsResponse {
        election: Election {
            id,
            name: "Municipal Election".to_string(),
            category: ElectionCategory::Municipal,
            election_date: NaiveDate::from_ymd_opt(2024, 10, 31).expect("date should be valid"),
            nomination_date: NaiveDate::from_ymd_opt(2024, 10, 1).expect("date should be valid"),
            political_groups: vec![PoliticalGroup {
                number: 1,
                name: "Political Group A".to_string(),
                candidates: vec![
                    Candidate {
                        number: 1,
                        initials: "A.".to_string(),
                        first_name: "Alice".to_string(),
                        last_name_prefix: Some("van".to_string()),
                        last_name: "Foo".to_string(),
                        locality: "Amsterdam".to_string(),
                        country_code: None,
                        gender: Some(CandidateGender::Female),
                    },
                    Candidate {
                        number: 2,
                        initials: "C.".to_string(),
                        first_name: "Charlie".to_string(),
                        last_name_prefix: None,
                        last_name: "Doe".to_string(),
                        locality: "Rotterdam".to_string(),
                        country_code: None,
                        gender: None,
                    },
                ],
            }],
        },
    }))
}
