use crate::domain::field_path::FieldPath;

pub trait Compare {
    fn compare(&self, first_entry: &Self, different_fields: &mut Vec<String>, path: &FieldPath);
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
