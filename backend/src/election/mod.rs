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
        post,
        path = "/api/elections/{id}",
        request_body = ElectionDetailsResponse,
        responses(
            (status = 200, description = "Election", body = ElectionDetailsResponse)
        ),
        params(
            ("id" = i64, description = "Election database id")
        ),
    )]
pub async fn election_details(
    Path(id): Path<i64>,
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
                        last_name: "Foo".to_string(),
                        locality: "Amsterdam".to_string(),
                        gender: Some(CandidateGender::Female),
                    },
                    Candidate {
                        number: 2,
                        initials: "C.".to_string(),
                        first_name: "Charlie".to_string(),
                        last_name: "Doe".to_string(),
                        locality: "Rotterdam".to_string(),
                        gender: None,
                    },
                ],
            }],
        },
    }))
}
