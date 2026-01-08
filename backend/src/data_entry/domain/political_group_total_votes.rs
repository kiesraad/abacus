use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use crate::{
    data_entry::domain::{
        compare::Compare,
        field_path::FieldPath,
        polling_station_results::count::Count,
        validate::{DataError, Validate, ValidationResults},
    },
    election::{ElectionWithPoliticalGroups, PGNumber},
    polling_station::PollingStation,
};

#[derive(Serialize, Deserialize, ToSchema, Clone, Debug, PartialEq, Eq, Hash)]
#[serde(deny_unknown_fields)]
pub struct PoliticalGroupTotalVotes {
    #[schema(value_type = u32)]
    pub number: PGNumber,
    #[schema(value_type = u32)]
    pub total: Count,
}

impl Compare for Vec<PoliticalGroupTotalVotes> {
    fn compare(&self, first_entry: &Self, different_fields: &mut Vec<String>, path: &FieldPath) {
        // compare total of each political group
        for (i, pgv) in self.iter().enumerate() {
            pgv.total.compare(
                &first_entry[i].total,
                different_fields,
                &path.index(i).field("total"),
            );
        }
    }
}

impl Validate for Vec<PoliticalGroupTotalVotes> {
    fn validate(
        &self,
        election: &ElectionWithPoliticalGroups,
        polling_station: &PollingStation,
        validation_results: &mut ValidationResults,
        path: &FieldPath,
    ) -> Result<(), DataError> {
        // check if the list of political group total votes has the correct length
        if election.political_groups.len() != self.len() {
            return Err(DataError::new(
                "list of political group total votes does not have correct length",
            ));
        }

        // check each political group total votes
        let mut previous_number = PGNumber::from(0);
        for (i, pgv) in self.iter().enumerate() {
            let number = pgv.number;
            if number <= previous_number {
                return Err(DataError::new(
                    "political group total votes numbers are not increasing",
                ));
            }
            previous_number = number;

            pgv.total.validate(
                election,
                polling_station,
                validation_results,
                &path.index(i).field("total"),
            )?;
        }
        Ok(())
    }
}
