use sqlx::SqliteConnection;
use zeroize::Zeroizing;

use crate::domain::election::ElectionId;

pub async fn get_certificate(
    conn: &mut SqliteConnection,
    election_id: ElectionId,
) -> Result<Option<String>, sqlx::Error> {
    sqlx::query_scalar!(
        r#"SELECT certificate FROM signing_keypair WHERE election_id = $1"#,
        election_id
    )
    .fetch_optional(conn)
    .await
}

pub async fn get_private_key(
    conn: &mut SqliteConnection,
    election_id: ElectionId,
) -> Result<Option<Zeroizing<Vec<u8>>>, sqlx::Error> {
    if let Some(key) = sqlx::query_scalar!(
        r#"SELECT private_key FROM signing_keypair WHERE election_id = $1"#,
        election_id
    )
    .fetch_optional(conn)
    .await?
    {
        Ok(Some(Zeroizing::new(key)))
    } else {
        Ok(None)
    }
}

pub async fn get_show_reminder(
    conn: &mut SqliteConnection,
    election_id: ElectionId,
) -> Result<Option<bool>, sqlx::Error> {
    sqlx::query_scalar!(
        r#"SELECT show_reminder FROM signing_keypair WHERE election_id = $1"#,
        election_id
    )
    .fetch_optional(conn)
    .await
}

pub async fn create(
    conn: &mut SqliteConnection,
    election_id: ElectionId,
    certificate: String,
    private_key: Zeroizing<Vec<u8>>,
) -> Result<(), sqlx::Error> {
    sqlx::query!(
        r#"
            INSERT INTO signing_keypair (election_id, certificate, private_key)
            VALUES ($1, $2, $3)
        "#,
        election_id,
        certificate,
        *private_key
    )
    .execute(conn)
    .await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use sqlx::SqlitePool;
    use test_log::test;

    use super::*;

    #[test(sqlx::test(fixtures("../../fixtures/election_1.sql")))]
    async fn test_get_before_create(pool: SqlitePool) {
        let mut conn = pool.acquire().await.unwrap();
        let election_id = ElectionId::from(1);
        assert_eq!(get_certificate(&mut conn, election_id).await.unwrap(), None);
        assert_eq!(get_private_key(&mut conn, election_id).await.unwrap(), None);
        assert_eq!(
            get_show_reminder(&mut conn, election_id).await.unwrap(),
            None
        );
    }

    #[test(sqlx::test(fixtures("../../fixtures/election_1.sql")))]
    async fn test_create_and_get(pool: SqlitePool) {
        let mut conn = pool.acquire().await.unwrap();

        let election_id = ElectionId::from(1);
        let certificate = String::from("testing");
        let private_key = Zeroizing::new(Vec::from("123456"));

        create(
            &mut conn,
            election_id,
            certificate.clone(),
            private_key.clone(),
        )
        .await
        .unwrap();

        assert_eq!(
            get_certificate(&mut conn, election_id).await.unwrap(),
            Some(certificate)
        );
        assert_eq!(
            get_private_key(&mut conn, election_id).await.unwrap(),
            Some(private_key)
        );
        assert_eq!(
            get_show_reminder(&mut conn, election_id).await.unwrap(),
            Some(true)
        );
    }
}
