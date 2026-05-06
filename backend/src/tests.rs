use std::fmt::Debug;

/// Asserts that two expressions are equal to each other (using [`Debug`]).
pub fn assert_fmt<T: Debug>(left: T, right: T) {
    assert_eq!(format!("{left:?}"), format!("{right:?}"));
}
