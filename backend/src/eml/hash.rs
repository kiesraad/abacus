use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

const CHUNK_COUNT: usize = 16;

#[derive(Debug, Deserialize, Serialize, Clone, ToSchema)]
pub struct EmlHash {
    pub chunks: [String; CHUNK_COUNT],
}

impl From<&[u8]> for EmlHash {
    fn from(input: &[u8]) -> Self {
        use sha2::Digest;
        use std::fmt::Write;
        let digest = sha2::Sha256::digest(input);

        let mut chunks = [const { String::new() }; CHUNK_COUNT];
        let mut chunk_counter = 0;
        let mut iter = digest.into_iter();
        while let (Some(b1), Some(b2)) = (iter.next(), iter.next()) {
            let mut chunk = String::new();
            write!(&mut chunk, "{:02x}", b1).expect("Writing to a string cannot fail");
            write!(&mut chunk, "{:02x}", b2).expect("Writing to a string cannot fail");
            chunks[chunk_counter] = chunk;
            chunk_counter += 1;
        }

        Self { chunks }
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
        let mut chunks = EmlHash::from(input).chunks;
        let redacted_indexes = Self::random_chunk_indexes();

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
    fn random_chunk_indexes() -> [usize; 2] {
        use rand::Rng;
        let mut rng = rand::rng();
        [
            rng.random_range(0..CHUNK_COUNT / 2),
            rng.random_range((CHUNK_COUNT / 2) + 1..CHUNK_COUNT),
        ]
    }
}

impl PartialEq for EmlHash {
    fn eq(&self, other: &Self) -> bool {
        self.chunks == other.chunks
    }
}

#[cfg(test)]
mod tests {
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
}
