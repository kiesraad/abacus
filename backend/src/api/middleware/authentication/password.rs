use std::ops::Deref;

use argon2::{
    Algorithm, Argon2, Params, Version,
    password_hash::{PasswordHash, PasswordHasher, PasswordVerifier, SaltString, rand_core::OsRng},
};
use serde::Deserialize;
use sqlx::Type;
use tokio::sync::Semaphore;

use super::error::AuthenticationError;

/// Helper newtype for password validation. Makes sure that password rules are followed when constructed with `new()`.
pub(crate) struct ValidatedPassword<'a>(&'a str);

/// Minimum length of a password
const MIN_PASSWORD_LEN: usize = 13;

/// Pre-computed Argon2id hash of "TotallyValidP4ssW0rd" (with default parameters)
/// Used as a dummy hash against timing attacks when the user does not exist.
pub(crate) const DUMMY_PASSWORD_HASH: &str = "$argon2id$v=19$m=19456,t=2,p=1$ySkT+RWXZ+VGKh0wxfz9kA$aCyyi3a6ok9WaKiX5Jvacrxi9ifPxTOQ8wba40rVAbg";

/// Limits concurrent Argon2 runs to 4.
static HASH_PERMITS: Semaphore = Semaphore::const_new(4);

impl<'pw> ValidatedPassword<'pw> {
    pub async fn new(
        username: &str,
        password: &'pw str,
        old_password: Option<&HashedPassword>,
    ) -> Result<Self, AuthenticationError> {
        // Total length
        if password.len() < MIN_PASSWORD_LEN {
            return Err(AuthenticationError::PasswordRejectionTooShort);
        }

        // Password cannot be the same as the username
        if username == password {
            return Err(AuthenticationError::PasswordRejectionSameAsUsername);
        }

        // Password cannot be the same as the old password
        match old_password {
            Some(old_pw) if verify_password(password, old_pw).await? => {
                Err(AuthenticationError::PasswordRejectionSameAsOld)
            }
            Some(_) | None => Ok(Self(password)),
        }
    }
}

/// Helper newtype indicating the containing string is hashed with `hash_password`.
/// Note that this newtype doesn't give any guarantees, as it is easily constructible
/// because of the `From<String>` impl.
#[derive(Deserialize, Default, PartialEq, Eq, Clone, Debug, Hash, Type)]
#[serde(deny_unknown_fields)]
#[sqlx(transparent)]
pub(crate) struct HashedPassword(String);

impl Deref for HashedPassword {
    type Target = String;

    fn deref(&self) -> &Self::Target {
        &self.0
    }
}

impl From<String> for HashedPassword {
    fn from(value: String) -> Self {
        Self(value)
    }
}

/// Hash a string password with Argon2id v19 and return the string representation of the hash/salt/params
pub(crate) async fn hash_password(
    password: &ValidatedPassword<'_>,
) -> Result<HashedPassword, AuthenticationError> {
    let password = password.0.to_owned();
    let permit = HASH_PERMITS.acquire().await?;

    tokio::task::spawn_blocking(move || {
        // Hold the permit until hashing is done
        let _permit = permit;
        let salt = SaltString::generate(&mut OsRng);

        // Argon2id v19
        let argon2 = Argon2::new(Algorithm::Argon2id, Version::V0x13, Params::default());

        Ok(HashedPassword(
            argon2
                .hash_password(password.as_bytes(), &salt)?
                .to_string(),
        ))
    })
    .await?
}

#[cfg(test)]
pub(crate) async fn hash_test_password(password: &str) -> HashedPassword {
    hash_password(&ValidatedPassword(password)).await.unwrap()
}

/// Verify a password against a password hash created with hash_password
pub(crate) async fn verify_password(
    password: &str,
    password_hash: &HashedPassword,
) -> Result<bool, AuthenticationError> {
    let password = password.to_owned();
    let password_hash = password_hash.clone();
    let permit = HASH_PERMITS.acquire().await?;

    Ok(tokio::task::spawn_blocking(move || {
        // Hold the permit until hashing is done
        let _permit = permit;
        let Ok(parsed_hash) = PasswordHash::new(&password_hash.0) else {
            return false;
        };

        // Argon2id v19
        let argon2 = Argon2::new(Algorithm::Argon2id, Version::V0x13, Params::default());

        argon2
            .verify_password(password.as_bytes(), &parsed_hash)
            .is_ok()
    })
    .await?)
}

#[cfg(test)]
mod tests {
    use std::time::Duration;

    use test_log::test;

    use super::*;

    #[test(tokio::test)]
    async fn test_hash_password_and_verify() {
        let password = "password";
        let hash = hash_password(&ValidatedPassword(password)).await.unwrap();

        assert!(verify_password(password, &hash).await.unwrap());
        assert!(!verify_password("wrong_password", &hash).await.unwrap());
        assert!(
            !verify_password(
                password,
                &HashedPassword(hash.replace("$argon2id$v=19", "$argon2id$v=16"))
            )
            .await
            .unwrap()
        );
    }

    #[test(tokio::test)]
    async fn test_password_hash_format() {
        let password = ValidatedPassword("CoordinatorPassword01");
        let hash = hash_password(&password).await.unwrap();

        dbg!(&hash);

        assert!(hash.starts_with("$argon2id$v=19$m="));
    }

    #[test(tokio::test)]
    async fn test_dummy_password_hash_matches_current_params() {
        let hash = hash_password(&ValidatedPassword("TotallyValidP4ssW0rd"))
            .await
            .unwrap();

        // Get and compare the parameters by getting everything before the last two '$' characters
        assert_eq!(
            hash.rsplitn(3, '$').last(),
            DUMMY_PASSWORD_HASH.rsplitn(3, '$').last()
        );
        assert!(
            verify_password(
                "TotallyValidP4ssW0rd",
                &HashedPassword::from(DUMMY_PASSWORD_HASH.to_string())
            )
            .await
            .unwrap()
        );
    }

    #[test(tokio::test)]
    async fn test_password_too_short_error() {
        assert!(
            ValidatedPassword::new("test_user", "too_short", None)
                .await
                .is_err()
        );
    }

    #[test(tokio::test)]
    async fn test_password_same_error() {
        let unhashed = "TotallyValidP4ssW0rd";
        let hashed = hash_password(&ValidatedPassword(unhashed)).await.unwrap();
        assert!(
            ValidatedPassword::new("test_user", unhashed, Some(&hashed))
                .await
                .is_err()
        );
    }

    #[test(tokio::test)]
    async fn test_password_valid() {
        assert!(
            ValidatedPassword::new("test_user", "TotallyValidP4ssW0rd", None)
                .await
                .is_ok()
        );
    }

    #[test(tokio::test)]
    async fn test_password_not_same_valid() {
        let old_password = hash_password(&ValidatedPassword("TotallyValidP4ssW0rd"))
            .await
            .unwrap();
        assert!(
            ValidatedPassword::new("test_user", "TotallyValidNewP4ssW0rd", Some(&old_password))
                .await
                .is_ok()
        );
    }

    #[test(tokio::test)]
    async fn test_password_same_as_username_error() {
        let old_password = hash_password(&ValidatedPassword("TotallyValidP4ssW0rd"))
            .await
            .unwrap();
        assert!(
            ValidatedPassword::new(
                "UsernameButAlsoValidPassword01",
                "UsernameButAlsoValidPassword01",
                Some(&old_password)
            )
            .await
            .is_err()
        );
    }

    #[test(tokio::test)]
    async fn test_hash_password_waits_for_permit() {
        let permits = HASH_PERMITS.acquire_many(4).await.unwrap();

        let result = tokio::time::timeout(
            Duration::from_millis(50),
            hash_password(&ValidatedPassword("password")),
        )
        .await;
        assert!(result.is_err(), "should wait for permit");

        drop(permits);
        assert!(hash_password(&ValidatedPassword("password")).await.is_ok());
    }
}
