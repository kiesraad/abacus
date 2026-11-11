/// Error type for models
#[derive(Debug)]
pub enum ModelsError {
    /// Data integrity violation in models
    DataIntegrityError(String),
}
