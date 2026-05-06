use sqlx::{SqliteConnection, query, types::Json};

use crate::domain::{
    apportionment_state::ApportionmentState, committee_session::CommitteeSessionId,
};

/// Inserts or updates the apportionment state in the database
pub async fn upsert(
    conn: &mut SqliteConnection,
    committee_session_id: CommitteeSessionId,
    state: &ApportionmentState,
) -> Result<(), sqlx::Error> {
    let state = Json(state);
    query!(
        r#"
            INSERT INTO apportionment (committee_session_id, state)
            VALUES($1, $2)
            ON CONFLICT (committee_session_id) DO UPDATE
            SET state = $2
            WHERE committee_session_id = $1
        "#,
        committee_session_id,
        state,
    )
    .execute(conn)
    .await?;

    Ok(())
}

/// Get the apportionment state from the database if it exists
pub async fn get(
    conn: &mut SqliteConnection,
    committee_session_id: CommitteeSessionId,
) -> Result<Option<ApportionmentState>, sqlx::Error> {
    let row = query!(
        r#"
            SELECT state AS "state: Json<ApportionmentState>"
            FROM apportionment
            WHERE committee_session_id = $1
        "#,
        committee_session_id
    )
    .fetch_optional(conn)
    .await?;

    Ok(row.map(|row| row.state.0))
}

#[cfg(test)]
mod tests {
    use sqlx::SqlitePool;
    use test_log::test;

    use super::*;
    use crate::domain::apportionment_state::DeceasedCandidate;

    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_1"))))]
    async fn test_upsert_get(pool: SqlitePool) {
        let mut conn = pool.acquire().await.unwrap();
        let committee_session_id = CommitteeSessionId::from(1);

        let state = get(&mut conn, committee_session_id)
            .await
            .expect("should succeed");

        assert!(state.is_none());

        let scenarios = [
            ApportionmentState::Uninitialised,
            ApportionmentState::RegisteringDeceasedCandidates {
                deceased_candidates: vec![DeceasedCandidate::from(4, 4)],
            },
            ApportionmentState::Finalised {
                deceased_candidates: vec![DeceasedCandidate::from(4, 4)],
            },
        ];

        for state in scenarios {
            upsert(&mut conn, committee_session_id, &state)
                .await
                .expect("should succeed");

            let retrieved_state = get(&mut conn, committee_session_id)
                .await
                .expect("should succeed")
                .expect("should be present in the database");

            assert_eq!(retrieved_state, state);
        }
    }
}
