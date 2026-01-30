use std::ops::Deref;

use argon2::{
    Algorithm, Argon2, Params, Version,
    password_hash::{PasswordHash, PasswordHasher, PasswordVerifier, SaltString, rand_core::OsRng},
};
use serde::Deserialize;
use sqlx::Type;

use super::error::AuthenticationError;

/// Helper newtype for password validation. Makes sure that password rules are followed when constructed with `new()`.
pub(crate) struct ValidatedPassword<'a>(&'a str);

/// Minimum length of a password
const MIN_PASSWORD_LEN: usize = 13;

impl<'pw> ValidatedPassword<'pw> {
    pub fn new(
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
            Some(old_pw) if verify_password(password, old_pw) => {
                Err(AuthenticationError::PasswordRejectionSameAsOld)
            }
            Some(_) | None => Ok(Self(password)),
        }
    }
}

/// Helper newtype indicating the containing string is hashed with `hash_password`.
/// Note that this newtype doesn't give any guarantees, as it is easily constructible
/// because of the From<String> impl.
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
pub(crate) fn hash_password(
    password: ValidatedPassword,
) -> Result<HashedPassword, AuthenticationError> {
    let salt = SaltString::generate(&mut OsRng);

    // Argon2id v19
    let argon2 = Argon2::new(Algorithm::Argon2id, Version::V0x13, Params::default());

    Ok(HashedPassword(
        argon2
            .hash_password(password.0.as_bytes(), &salt)?
            .to_string(),
    ))
}

/// Verify a password against a password hash created with hash_password
pub(crate) fn verify_password(password: &str, password_hash: &HashedPassword) -> bool {
    let Ok(parsed_hash) = PasswordHash::new(&password_hash.0) else {
        return false;
    };

    // Argon2id v19
    let argon2 = Argon2::new(Algorithm::Argon2id, Version::V0x13, Params::default());

    argon2
        .verify_password(password.as_bytes(), &parsed_hash)
        .is_ok()
}

#[cfg(test)]
mod tests {
    use test_log::test;

    use super::*;

    #[test]
    fn test_hash_password_and_verify() {
        let password = "password";
        let hash = hash_password(ValidatedPassword(password)).unwrap();

        assert!(verify_password(password, &hash));
        assert!(!verify_password("wrong_password", &hash));
        assert!(!verify_password(
            password,
            &HashedPassword(hash.replace("$argon2id$v=19", "$argon2id$v=16"))
        ));
    }

    #[test]
    fn test_password_hash_format() {
        let password = ValidatedPassword("CoordinatorPassword01");
        let hash = hash_password(password).unwrap();

        dbg!(&hash);

        assert!(hash.starts_with("$argon2id$v=19$m="));
    }

    #[test]
    fn test_password_too_short_error() {
        assert!(ValidatedPassword::new("test_user", "too_short", None).is_err());
    }

    #[test]
    fn test_password_same_error() {
        let unhashed = "TotallyValidP4ssW0rd";
        let hashed = hash_password(ValidatedPassword(unhashed)).unwrap();
        assert!(ValidatedPassword::new("test_user", unhashed, Some(&hashed)).is_err());
    }

    #[test]
    fn test_password_valid() {
        assert!(ValidatedPassword::new("test_user", "TotallyValidP4ssW0rd", None).is_ok());
    }

    #[test]
    fn test_password_not_same_valid() {
        let old_password = hash_password(ValidatedPassword("TotallyValidP4ssW0rd")).unwrap();
        assert!(
            ValidatedPassword::new("test_user", "TotallyValidNewP4ssW0rd", Some(&old_password))
                .is_ok()
        );
    }

    #[test]
    fn test_password_same_as_username_error() {
        let old_password = hash_password(ValidatedPassword("TotallyValidP4ssW0rd")).unwrap();
        assert!(
            ValidatedPassword::new(
                "UsernameButAlsoValidPassword01",
                "UsernameButAlsoValidPassword01",
                Some(&old_password)
            )
            .is_err()
        );
    }
}
