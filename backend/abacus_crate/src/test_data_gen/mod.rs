use rand::distr::uniform::SampleRange;
use serde::{Deserialize, Deserializer, de};
use std::{error::Error, fmt, ops::Range, str::FromStr};
use utoipa::{PartialSchema, ToSchema};

mod api;
mod data;
mod generators;

pub use api::router;
pub use generators::create_test_election;

#[derive(Clone, Debug)]
pub struct RandomRange(pub Range<u32>);

/// Abacus API and asset server
#[derive(Debug, Deserialize, ToSchema, Clone)]
pub struct GenerateElectionArgs {
    /// Number of political groups to create
    pub political_groups: RandomRange,

    /// Number of candidates to create
    pub candidates_per_group: RandomRange,

    /// Number of polling stations to create
    pub polling_stations: RandomRange,

    /// Number of voters to create
    pub voters: RandomRange,

    /// Number of seats in the election
    pub seats: RandomRange,

    /// Include (part of) data entry for this election
    pub with_data_entry: bool,

    /// Percentage of the first data entry to complete if data entry is included
    pub first_data_entry: RandomRange,

    /// Percentage of the completed first data entries that also get a second data entry
    pub second_data_entry: RandomRange,

    /// Percentage of voters that voted (given we generate data entries)
    pub turnout: RandomRange,

    pub candidate_distribution_slope: RandomRange,
    pub political_group_distribution_slope: RandomRange,
}

impl<'de> Deserialize<'de> for RandomRange {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        struct RandomRangeVisitor;

        impl<'de> de::Visitor<'de> for RandomRangeVisitor {
            type Value = RandomRange;

            fn expecting(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
                formatter.write_str("a range string like '1..10' or '1..=10'")
            }

            fn visit_str<E>(self, value: &str) -> Result<Self::Value, E>
            where
                E: de::Error,
            {
                parse_range::<u32>(value)
                    .map(RandomRange)
                    .map_err(E::custom)
            }

            fn visit_string<E>(self, value: String) -> Result<Self::Value, E>
            where
                E: de::Error,
            {
                self.visit_str(&value)
            }
        }

        deserializer.deserialize_str(RandomRangeVisitor)
    }
}

impl PartialSchema for RandomRange {
    fn schema() -> utoipa::openapi::RefOr<utoipa::openapi::schema::Schema> {
        String::schema()
    }
}

impl ToSchema for RandomRange {}

pub fn parse_range<T>(range: &str) -> Result<Range<T>, Box<dyn Error + 'static + Send + Sync>>
where
    T: FromStr + std::ops::Add<T, Output = T> + From<u8> + Copy,
    <T as FromStr>::Err: Error + Send + Sync + 'static,
{
    let mut iter = range.split("..");
    let lower_bound = T::from_str(&iter.next().ok_or("Invalid range")?.replace("_", ""))?;
    let upper_bound = if let Some(bound) = iter.next() {
        if let Some(bound) = bound.strip_prefix("=") {
            // add one to the bound, assumes that the bound is not already a max
            T::from_str(&bound.replace("_", ""))? + T::from(1u8)
        } else {
            T::from_str(&bound.replace("_", ""))?
        }
    } else {
        lower_bound + T::from(1u8) // add one to the lower bound, this could fail if the lower bound is already a max
    };
    Ok(lower_bound..upper_bound)
}

impl SampleRange<u32> for RandomRange {
    fn sample_single<R: rand::RngCore + ?Sized>(
        self,
        rng: &mut R,
    ) -> Result<u32, rand::distr::uniform::Error> {
        self.0.sample_single(rng)
    }

    fn is_empty(&self) -> bool {
        self.0.is_empty()
    }
}
