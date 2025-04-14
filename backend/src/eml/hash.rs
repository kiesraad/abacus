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
pub struct RetractedEmlHash {
    hash: EmlHash,
    pub retracted_indexes: (usize, usize),
}

impl From<&[u8]> for RetractedEmlHash {
    fn from(input: &[u8]) -> Self {
        let retracted_indexes = Self::random_chunk_indexes();
        let mut hash = EmlHash::from(input);
        hash.chunks[retracted_indexes.0] = String::new();
        hash.chunks[retracted_indexes.1] = String::new();
        Self {
            hash,
            retracted_indexes,
        }
    }
}

impl RetractedEmlHash {
    pub fn retracted(&self) -> [String; CHUNK_COUNT] {
        let mut result = self.hash.chunks.clone();
        result[self.retracted_indexes.0] = String::new();
        result[self.retracted_indexes.1] = String::new();
        result
    }

    fn random_chunk_indexes() -> (usize, usize) {
        use rand::Rng;
        let mut rng = rand::rng();
        let first_idx = rng.random_range(0..CHUNK_COUNT);
        let mut second_idx = rng.random_range(0..CHUNK_COUNT);
        while first_idx == second_idx {
            second_idx = rng.random_range(0..CHUNK_COUNT);
        }
        (first_idx, second_idx)
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
