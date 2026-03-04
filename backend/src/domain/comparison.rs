use crate::domain::{
    data_entry::{PoliticalGroupTotalVotes, PollingStationResults, YesNo},
    validation::FieldPath,
};

pub trait Compare {
    fn compare(&self, first_entry: &Self, different_fields: &mut Vec<String>, path: &FieldPath);
}

impl Compare for PollingStationResults {
    fn compare(&self, first_entry: &Self, different_fields: &mut Vec<String>, path: &FieldPath) {
        match (self, first_entry) {
            (
                PollingStationResults::CSOFirstSession(s),
                PollingStationResults::CSOFirstSession(f),
            ) => s.compare(f, different_fields, path),
            (
                PollingStationResults::CSONextSession(s),
                PollingStationResults::CSONextSession(f),
            ) => s.compare(f, different_fields, path),
            _ => {
                different_fields.push(path.to_string());
            }
        }
    }
}

impl Compare for YesNo {
    fn compare(&self, first_entry: &Self, different_fields: &mut Vec<String>, path: &FieldPath) {
        if self != first_entry {
            different_fields.push(path.to_string());
        }
    }
}

impl Compare for bool {
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
