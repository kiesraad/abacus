use std::iter::Iterator;

use axum::{
    Json,
    extract::{Path, State},
    response::IntoResponse,
};
use axum_extra::response::Attachment;
use chrono::{DateTime, Utc};
use eml_signature;
use serde::Serialize;
use sqlx::SqlitePool;
use utoipa::ToSchema;
use utoipa_axum::{router::OpenApiRouter, routes};

use crate::{
    APIError, AppState, ErrorResponse,
    api::middleware::authentication::RouteAuthorization,
    domain::{
        election::{CommitteeCategory, ElectionId, ElectionWithPoliticalGroups},
        role::Role,
    },
    error::ErrorReference,
    infra::audit_log::AuditService,
    repository::election_repo,
    service::get_election_certificate,
};

pub fn router() -> OpenApiRouter<AppState> {
    const ADMIN: &[Role] = &[Role::Administrator];

    OpenApiRouter::default()
        .routes(routes!(certificate).authorize(ADMIN))
        .routes(routes!(certificate_details).authorize(ADMIN))
}

#[derive(Serialize, ToSchema, Debug, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct CertificateDetailsResponse {
    pub election_identifier: String,
    pub organizational_unit: String,
    pub common_name: String,
    pub not_before: DateTime<Utc>,
    pub not_after: DateTime<Utc>,
    pub signature_algorithm: String,
}

impl From<eml_signature::Certificate> for CertificateDetailsResponse {
    fn from(certificate: eml_signature::Certificate) -> Self {
        let subject = certificate.subject().clone();
        Self {
            election_identifier: subject.election_identifier,
            organizational_unit: subject.organizational_unit,
            common_name: subject.common_name,
            not_before: certificate.not_before(),
            not_after: certificate.not_after(),
            signature_algorithm: format!("RSA {}-bit", eml_signature::RSA_KEY_BITS),
        }
    }
}

/// Get the election certificate details
#[utoipa::path(
    get,
    path = "/api/elections/{election_id}/certificate_details",
    responses(
        (status = 200, description = "Election certificate details", body = CertificateDetailsResponse),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 404, description = "Not Found", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    params(
        ("election_id" = ElectionId, description = "Election database id"),
    ),
)]
pub async fn certificate_details(
    State(pool): State<SqlitePool>,
    audit_service: AuditService,
    Path(election_id): Path<ElectionId>,
) -> Result<Json<CertificateDetailsResponse>, APIError> {
    let mut conn = pool.acquire().await?;
    let election = election_repo::get(&mut conn, election_id).await?;
    if election.committee_category != CommitteeCategory::GSB {
        return Err(APIError::NotFound(
            "Certificate is only available for GSB elections".into(),
            ErrorReference::EntryNotFound,
        ));
    }

    let certificate_pem = get_election_certificate(&mut conn, &audit_service, &election).await?;

    let certificate = eml_signature::Certificate::from_pem(certificate_pem.as_bytes())
        .map_err(|e| APIError::DataIntegrityError(e.to_string()))?;

    Ok(Json(certificate.into()))
}

/// Download the election certificate
#[utoipa::path(
    get,
    path = "/api/elections/{election_id}/certificate",
    responses(
        (
            status = 200,
            description = "Election certificate",
            content_type = "application/x-pem-file",
            headers(
                ("Content-Disposition", description = "attachment; filename=\"filename.crt\"")
            )),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 404, description = "Not Found", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    params(
        ("election_id" = ElectionId, description = "Election database id"),
    ),
)]
pub async fn certificate(
    State(pool): State<SqlitePool>,
    audit_service: AuditService,
    Path(election_id): Path<ElectionId>,
) -> Result<impl IntoResponse, APIError> {
    let mut conn = pool.acquire().await?;
    let election = election_repo::get(&mut conn, election_id).await?;
    if election.committee_category != CommitteeCategory::GSB {
        return Err(APIError::NotFound(
            "Certificate is only available for GSB elections".into(),
            ErrorReference::EntryNotFound,
        ));
    }

    let certificate = get_election_certificate(&mut conn, &audit_service, &election).await?;

    let attachment = Attachment::new(certificate)
        .content_type("application/x-pem-file".to_string())
        .filename(public_key_filename(&election)?);
    Ok(attachment)
}

fn public_key_filename(election: &ElectionWithPoliticalGroups) -> Result<String, APIError> {
    match election.committee_category {
        CommitteeCategory::GSB => Ok(format!(
            "public_key_abacus_{}_gemeente_{}.crt",
            election.election_id.to_lowercase(),
            region_name(&election.authority_region)
        )),

        CommitteeCategory::CSB => Err(APIError::DataIntegrityError(
            "Signing not supported for CSB".to_string(),
        )),
    }
}
/// Map Dutch lowercase characters with diacritics to their base character
/// https://nl.wikipedia.org/wiki/Accenttekens_in_de_Nederlandse_spelling#Frequentie
fn strip_diacritic(c: char) -> char {
    match c {
        'à' | 'á' | 'â' | 'ä' | 'å' => 'a',
        'è' | 'é' | 'ê' | 'ë' => 'e',
        'ì' | 'í' | 'î' | 'ï' => 'i',
        'ò' | 'ó' | 'ô' | 'ö' => 'o',
        'ù' | 'ú' | 'û' | 'ü' => 'u',
        'ý' | 'ŷ' | 'ÿ' => 'y',
        'ç' => 'c',
        'ñ' => 'n',
        other => other,
    }
}

/// Remove diacritics, preserve inner hyphens, spaces become "-", all lowercase
fn region_name(authority_region: &str) -> String {
    authority_region
        .to_lowercase()
        .chars()
        .map(strip_diacritic)
        .map(|c| if c == ' ' { '-' } else { c })
        .filter(|c| c.is_alphabetic() || *c == '-')
        .collect()
}

#[cfg(test)]
mod tests {
    use std::assert_matches;

    use http_body_util::BodyExt;
    use test_log::test;

    use super::*;
    use crate::{
        domain::election::{ElectionCategory, tests::election_fixture},
        repository::user_repo::{User, UserId},
    };

    #[test]
    fn test_region_name() {
        #[rustfmt::skip]
        let test_cases = [
            ("Utrecht", "utrecht"),
            ("'s-Hertogenbosch", "s-hertogenbosch"),
            ("Reusel-De Mierden", "reusel-de-mierden"),
            ("Nuenen, Gerwen en Nederwetten", "nuenen-gerwen-en-nederwetten"),
            ("Nuenen c.a.", "nuenen-ca"),
            ("Súdwest-Fryslân", "sudwest-fryslan"),
        ];

        for (region, expected) in test_cases {
            assert_eq!(region_name(region), expected);
        }
    }

    #[test]
    fn test_public_key_filename_gsb() {
        let election = election_fixture(ElectionCategory::Municipal, CommitteeCategory::GSB, &[]);
        let filename = public_key_filename(&election).expect("Should succeed for GSB");
        assert_eq!(filename, "public_key_abacus_gr2023_test_gemeente_test.crt");
    }

    #[test]
    fn test_public_key_filename_csb() {
        let election = election_fixture(ElectionCategory::Municipal, CommitteeCategory::CSB, &[]);
        assert_matches!(
            public_key_filename(&election),
            Err(APIError::DataIntegrityError(_))
        );
    }

    #[test(sqlx::test(fixtures(
        path = "../../fixtures",
        scripts("election_1", "signing_keypair")
    )))]
    async fn test_certificate_details(pool: SqlitePool) {
        let election_id = ElectionId::from(1);
        let user = User::test_user(Role::Administrator, UserId::from(1));

        let result = certificate_details(
            State(pool),
            AuditService::new(Some(user), None),
            Path(election_id),
        )
        .await;

        let details = result.expect("should be ok").0;
        assert_eq!(details.election_identifier, "GR2026_Juinen");
        assert_eq!(details.common_name, "Gemeente Juinen");
    }

    #[test(sqlx::test(fixtures(
        path = "../../fixtures",
        scripts("election_1", "signing_keypair")
    )))]
    async fn test_certificate(pool: SqlitePool) {
        let election_id = ElectionId::from(1);
        let user = User::test_user(Role::Administrator, UserId::from(1));

        let result = certificate(
            State(pool),
            AuditService::new(Some(user), None),
            Path(election_id),
        )
        .await;

        let response = dbg!(result.expect("should be ok").into_response());
        assert_eq!(
            response.headers().get("content-type").unwrap(),
            "application/x-pem-file"
        );
        assert_eq!(
            response.headers().get("content-disposition").unwrap(),
            r#"attachment; filename="public_key_abacus_gr2026_juinen_gemeente_juinen.crt""#
        );

        let body = response.into_body().collect().await.unwrap().to_bytes();
        assert!(body.starts_with("-----BEGIN CERTIFICATE-----\n".as_bytes()));
    }
}
