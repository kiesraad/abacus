use crate::domain::{
    compare::Compare,
    election::ElectionWithPoliticalGroups,
    field_path::FieldPath,
    validate::{DataError, Validate, ValidationResults},
};

pub type Count = u32;

impl Compare for Count {
    fn compare(
        &self,
        first_entry: &Self,
        different_fields: &mut Vec<String>,
        field_name: &FieldPath,
    ) {
        if self != first_entry {
            different_fields.push(field_name.to_string());
        }
    }
}

impl Validate for Count {
    fn validate(
        &self,
        _election: &ElectionWithPoliticalGroups,
        _path: &FieldPath,
    ) -> Result<ValidationResults, DataError> {
        if self > &999_999_999 {
            return Err(DataError::new("count out of range"));
        }
        Ok(ValidationResults::default())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::election::{CommitteeCategory, tests::election_fixture};
    #[test]
    fn test_count_err_out_of_range() {
        let count: Count = 1_000_000_000;

        let result = count.validate(&election_fixture(CommitteeCategory::GSB, &[]), &"".into());

        assert!(result.is_err());
        assert!(result.unwrap_err().message.eq("count out of range"),);
    }
}
