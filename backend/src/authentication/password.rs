use std::ops::Deref;

use argon2::{
    Algorithm, Argon2, Params, Version,
    password_hash::{PasswordHash, PasswordHasher, PasswordVerifier, SaltString, rand_core::OsRng},
};
use serde::Deserialize;
use sqlx::Type;

use super::error::AuthenticationError;

pub(super) struct ValidatedPassword<'a>(&'a str);

const MIN_PASSWORD_LEN: usize = 13;

impl<'pw> ValidatedPassword<'pw> {
    pub fn new(
        password: &'pw str,
        old_password: Option<&HashedPassword>,
    ) -> Result<Self, AuthenticationError> {
        // Total length
        if password.len() < MIN_PASSWORD_LEN {
            return Err(AuthenticationError::PasswordRejection);
        }

        match old_password {
            Some(old_pw) if verify_password(password, old_pw) => {
                Err(AuthenticationError::PasswordRejection)
            }
            Some(_) | None => Ok(Self(password)),
        }
    }
}

#[derive(Deserialize, Default, PartialEq, Eq, Clone, Debug, Hash, Type)]
#[sqlx(transparent)]
pub(super) struct HashedPassword(String);

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
pub(super) fn hash_password(
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
pub(super) fn verify_password(password: &str, password_hash: &HashedPassword) -> bool {
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
    use super::*;
    use test_log::test;

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
        let password = ValidatedPassword("password");
        let hash = hash_password(password).unwrap();

        dbg!(&hash);

        assert!(hash.starts_with("$argon2id$v=19$m="));
    }
}
