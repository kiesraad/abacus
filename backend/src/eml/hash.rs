use std::{fmt::Write, sync::LazyLock};

use rand::{RngExt, SeedableRng, rngs::StdRng, seq::index::sample_array};
use serde::{Deserialize, Serialize};
use sha2::Digest;
use utoipa::ToSchema;

pub const CHUNK_COUNT: usize = 16;

/// Per-process salt for selecting the redacted chunks, so the index of these
/// chunks cannot be predicted from the file alone.
static HASH_SALT: LazyLock<[u8; 32]> = LazyLock::new(|| rand::rng().random());

#[derive(Debug, Deserialize, Serialize, Clone, ToSchema)]
pub struct EmlHash {
    pub chunks: [String; CHUNK_COUNT],
    pub digest: [u8; 32],
}

impl From<&[u8]> for EmlHash {
    fn from(input: &[u8]) -> Self {
        let digest = sha2::Sha256::digest(input);

        let mut chunks = [const { String::new() }; CHUNK_COUNT];
        let mut chunk_counter = 0;
        let mut iter = digest.iter();

        while let (Some(b1), Some(b2)) = (iter.next(), iter.next()) {
            let mut chunk = String::new();
            write!(&mut chunk, "{b1:02x}").expect("Writing to a string cannot fail");
            write!(&mut chunk, "{b2:02x}").expect("Writing to a string cannot fail");
            chunks[chunk_counter] = chunk;
            chunk_counter += 1;
        }

        Self {
            chunks,
            digest: digest.into(),
        }
    }
}

impl From<EmlHash> for String {
    fn from(hash: EmlHash) -> Self {
        hash.chunks.join(" ")
    }
}

#[derive(Debug, Deserialize, Serialize, Clone, ToSchema)]
pub struct RedactedEmlHash {
    /// Array holding the hash chunks as text
    chunks: [String; CHUNK_COUNT],
    /// Indexes of chunks that will be empty, sorted
    pub redacted_indexes: [usize; 2],
}

impl From<&[u8]> for RedactedEmlHash {
    fn from(input: &[u8]) -> Self {
        let hash = EmlHash::from(input);
        let mut chunks = hash.chunks;
        let redacted_indexes = Self::random_chunk_indexes(&HASH_SALT, hash.digest);

        // Retract the chunks by replacing it with an empty string
        for index in redacted_indexes {
            chunks[index] = String::new();
        }

        Self {
            chunks,
            redacted_indexes,
        }
    }
}

impl RedactedEmlHash {
    /// Select two distinct chunk indexes, uniformly from all possible pairs
    fn random_chunk_indexes(salt: &[u8; 32], digest: [u8; 32]) -> [usize; 2] {
        let seed = sha2::Sha256::new()
            .chain_update(salt)
            .chain_update(digest)
            .finalize();
        let mut rng = StdRng::from_seed(seed.into());

        let mut indexes: [usize; 2] =
            sample_array(&mut rng, CHUNK_COUNT).expect("CHUNK_COUNT is at least 2");
        indexes.sort_unstable();
        indexes
    }
}

impl PartialEq for EmlHash {
    fn eq(&self, other: &Self) -> bool {
        self.chunks == other.chunks
    }
}

#[cfg(test)]
mod tests {
    use std::collections::HashSet;

    use super::{CHUNK_COUNT, RedactedEmlHash};
    use crate::eml::EmlHash;

    #[test]
    fn test_eml_document_hash() {
        let input = "test";
        let hash = EmlHash::from(input.as_bytes());
        assert_eq!(
            String::from(hash),
            "9f86 d081 884c 7d65 9a2f eaa0 c55a d015 a3bf 4f1b 2b0b 822c d15d 6c15 b0f0 0a08"
        );
    }

    #[test]
    fn test_random_chunk_indexes_deterministic_and_valid() {
        let salt = [1; 32];
        let digest = [2; 32];
        let [first, second] = RedactedEmlHash::random_chunk_indexes(&salt, digest);
        assert!(first < second);
        assert!(second < CHUNK_COUNT);
        assert_eq!(
            RedactedEmlHash::random_chunk_indexes(&salt, digest),
            [first, second]
        );
    }

    #[test]
    fn test_random_chunk_indexes_depends_on_salt() {
        assert!((0..10u8).any(|i| {
            let digest = [i; 32];
            RedactedEmlHash::random_chunk_indexes(&[1; 32], digest)
                != RedactedEmlHash::random_chunk_indexes(&[3; 32], digest)
        }));
    }

    #[test]
    fn test_random_chunk_indexes_covers_all_pairs() {
        let salt = [1; 32];
        let pairs: HashSet<[usize; 2]> = (0..2000u32)
            .map(|i| {
                let mut digest = [0; 32];
                digest[..4].copy_from_slice(&i.to_le_bytes());
                RedactedEmlHash::random_chunk_indexes(&salt, digest)
            })
            .collect();
        assert_eq!(pairs.len(), CHUNK_COUNT * (CHUNK_COUNT - 1) / 2);
        assert!(pairs.iter().all(|[first, second]| first < second));
    }

    #[test]
    fn test_redacted_eml_hash() {
        let input = "test".as_bytes();
        let hash = EmlHash::from(input);
        let redacted = RedactedEmlHash::from(input);

        // Only the selected chunks are redacted
        for (index, chunk) in redacted.chunks.iter().enumerate() {
            if redacted.redacted_indexes.contains(&index) {
                assert!(chunk.is_empty(), "Selected chunk {index} must be empty");
            } else {
                assert_eq!(
                    chunk, &hash.chunks[index],
                    "Unselected chunk {index} must match the full hash"
                );
            }
        }

        // Redacting the same input again should give the same result, because
        // the salt changes per process
        assert_eq!(
            RedactedEmlHash::from(input).redacted_indexes,
            redacted.redacted_indexes
        );
    }
}
