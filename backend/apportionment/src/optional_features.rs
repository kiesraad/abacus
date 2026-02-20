//! Helper to define bounds for OptionalFeatures based on activated features

#[cfg(all(feature = "serde", feature = "utoipa"))]
pub trait OptionalFeatures: serde::Serialize + utoipa::ToSchema {}
#[cfg(all(feature = "serde", feature = "utoipa"))]
impl<T: serde::Serialize + utoipa::ToSchema> OptionalFeatures for T {}

#[cfg(all(feature = "serde", not(feature = "utoipa")))]
pub trait OptionalFeatures: serde::Serialize {}
#[cfg(all(feature = "serde", not(feature = "utoipa")))]
impl<T: serde::Serialize> OptionalFeatures for T {}

#[cfg(all(not(feature = "serde"), feature = "utoipa"))]
pub trait OptionalFeatures: utoipa::ToSchema {}
#[cfg(all(not(feature = "serde"), feature = "utoipa"))]
impl<T: utoipa::ToSchema> OptionalFeatures for T {}

#[cfg(not(any(feature = "serde", feature = "utoipa")))]
pub trait OptionalFeatures {}
#[cfg(not(any(feature = "serde", feature = "utoipa")))]
impl<T> OptionalFeatures for T {}
