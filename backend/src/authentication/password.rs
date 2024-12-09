use argon2::{
    password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Algorithm, Argon2, Params, Version,
};

use super::error::AuthenticationError;

/// Hash a string password with Argon2id v19 and return the string representation of the hash/salt/params
pub(super) fn hash_password(password: &str) -> Result<String, AuthenticationError> {
    let salt = SaltString::generate(&mut OsRng);

    // Argon2id v19
    let argon2 = Argon2::new(Algorithm::Argon2id, Version::V0x13, Params::default());

    Ok(argon2
        .hash_password(password.as_bytes(), &salt)?
        .to_string())
}

/// Verify a password against a password hash created with hash_password
pub(super) fn verify_password(password: &str, password_hash: &str) -> bool {
    let Ok(parsed_hash) = PasswordHash::new(password_hash) else {
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

    #[test]
    fn test_hash_password_and_verify() {
        let password = "password";
        let hash = hash_password(password).unwrap();

        assert!(verify_password(password, &hash));
        assert!(!verify_password("wrong_password", &hash));
        assert!(!verify_password(
            password,
            &hash.replace("$argon2id$v=19", "$argon2id$v=16")
        ));
    }

    #[test]
    fn test_password_hash_format() {
        let password = "password";
        let hash = hash_password(password).unwrap();

        dbg!(&hash);

        assert!(hash.starts_with("$argon2id$v=19$m="));
    }
}
