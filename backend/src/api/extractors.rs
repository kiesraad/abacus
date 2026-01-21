use axum::{
    extract::{FromRef, FromRequestParts, Path},
    http::request::Parts,
};
use sqlx::SqlitePool;

use crate::{APIError, error::ErrorReference, repository::polling_station_repo};

pub struct CurrentSessionPollingStationId(pub u32);

impl<S> FromRequestParts<S> for CurrentSessionPollingStationId
where
    SqlitePool: FromRef<S>,
    S: Send + Sync,
{
    type Rejection = APIError;

    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        let path_extractor = Path::<u32>::from_request_parts(parts, state).await;
        let pool = SqlitePool::from_ref(state);
        let mut conn = pool.acquire().await?;

        if let Ok(Path(id)) = path_extractor
            && polling_station_repo::get(&mut conn, id).await.is_ok()
        {
            return Ok(CurrentSessionPollingStationId(id));
        }

        Err(APIError::NotFound(
            "Polling station not found for the current committee session".to_string(),
            ErrorReference::EntryNotFound,
        ))
    }
}
