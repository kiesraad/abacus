pub use self::structs::*;

pub mod repository;
pub mod structs;

#[cfg(test)]
mod tests {
    use sqlx::{query, SqlitePool};

    #[sqlx::test(fixtures("../../fixtures/elections.sql"))]
    async fn test_polling_station_number_unique_per_election(pool: SqlitePool) {
        // Insert two unique polling stations
        let _ = query!(r#"
INSERT INTO polling_stations (id, election_id, name, number, number_of_voters, polling_station_type, street, house_number, house_number_addition, postal_code, locality)
VALUES
(1, 1, 'Op Rolletjes', 33, NULL, 'mobiel', 'Rijksweg A12', '1', NULL, '1234 YQ', 'Den Haag'),
(2, 1, 'Testplek', 34, NULL, 'bijzonder', 'Teststraat', '2', 'b', '1234 QY', 'Testdorp')
"#)
        .execute(&pool)
        .await
        .unwrap();

        // Add a polling station with the same number to a different election
        let _ = query!(r#"
INSERT INTO polling_stations (id, election_id, name, number, number_of_voters, polling_station_type, street, house_number, house_number_addition, postal_code, locality)
VALUES
(3, 2, 'Op Rolletjes', 33, NULL, 'mobiel', 'Rijksweg A12', '1', NULL, '1234 YQ', 'Den Haag');
"#)
        .execute(&pool)
        .await
        .unwrap();

        // Add a polling station with a duplicate number and assert that it fails
        let result = query!(r#"
INSERT INTO polling_stations (id, election_id, name, number, number_of_voters, polling_station_type, street, house_number, house_number_addition, postal_code, locality)
VALUES
(4, 1, 'Op Rolletjes', 33, NULL, 'mobiel', 'Rijksweg A12', '1', NULL, '1234 YQ', 'Den Haag');
"#)
        .execute(&pool)
        .await;

        assert!(result.is_err());
    }
}
