use crate::{
    data_entry::domain::{
        compare::Compare,
        field_path::FieldPath,
        validate::{DataError, Validate, ValidationResults},
    },
    election::domain::ElectionWithPoliticalGroups,
    polling_station::PollingStation,
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
        _polling_station: &PollingStation,
        _validation_results: &mut ValidationResults,
        _field_name: &FieldPath,
    ) -> Result<(), DataError> {
        if self > &999_999_999 {
            return Err(DataError::new("count out of range"));
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_count_err_out_of_range() {
        let mut validation_results = ValidationResults::default();
        let count: Count = 1_000_000_000;

        let result = count.validate(
            &ElectionWithPoliticalGroups::election_fixture(&[]),
            &PollingStation::polling_station_fixture(None),
            &mut validation_results,
            &"".into(),
        );

        assert!(result.is_err());
        assert!(result.unwrap_err().message.eq("count out of range"));
    }
}
