use typst::{
    Library, LibraryExt, World,
    diag::{FileError, FileResult},
    foundations::{Bytes, Datetime},
    syntax::{FileId, Source, VirtualPath},
    text::{Font, FontBook},
    utils::LazyHash,
};

use super::PdfGenError;
use crate::PdfGenInput;

/// Contains the context for rendering PDFs.
#[derive(Clone)]
pub struct PdfWorld {
    sources: Vec<Source>,
    library: LazyHash<Library>,
    fontbook: LazyHash<FontBook>,
    fonts: Vec<Font>,
    main_source: Source,
    input_data: (FileId, Bytes),
}

impl PdfWorld {
    /// Create a new context for rendering PDFs from a [`PdfGenInput`].
    pub fn new(input: PdfGenInput) -> Result<PdfWorld, PdfGenError> {
        let sources: Vec<Source> = input
            .sources
            .iter()
            .map(|s| {
                Source::new(
                    FileId::new(None, VirtualPath::new(s.path)),
                    s.content.into(),
                )
            })
            .collect();

        let mut fonts = vec![];
        let mut fontbook = FontBook::new();
        for font_data in &input.fonts {
            let font = Font::new(Bytes::new(font_data.0), 0).expect("Error reading font file");
            fontbook.push(font.info().clone());
            fonts.push(font);
        }

        let main_source = sources
            .iter()
            .find(|s| s.id().vpath().as_rootless_path().to_str() == Some(input.main_template_path))
            .cloned()
            .ok_or_else(|| PdfGenError::TemplateNotFound(input.main_template_path.to_string()))?;

        let input_data = (
            FileId::new(None, VirtualPath::new(input.input_path)),
            Bytes::from_string(input.input_json),
        );

        Ok(PdfWorld {
            sources,
            fontbook: LazyHash::new(fontbook),
            fonts,
            library: LazyHash::new(Library::builder().build()),
            main_source,
            input_data,
        })
    }
}

impl World for PdfWorld {
    fn library(&self) -> &LazyHash<Library> {
        &self.library
    }

    fn book(&self) -> &LazyHash<FontBook> {
        &self.fontbook
    }

    fn main(&self) -> FileId {
        self.main_source.id()
    }

    fn source(&self, id: FileId) -> FileResult<Source> {
        for source in &self.sources {
            if source.id() == id {
                return Ok(source.clone());
            }
        }

        Err(FileError::NotFound(id.vpath().as_rootless_path().into()))
    }

    fn file(&self, id: FileId) -> FileResult<Bytes> {
        // if the file we need is the input file, pass that
        if self.input_data.0 == id {
            return Ok(self.input_data.1.clone());
        }

        Err(FileError::NotFound(id.vpath().as_rootless_path().into()))
    }

    fn font(&self, index: usize) -> Option<Font> {
        self.fonts.get(index).cloned()
    }

    fn today(&self, offset: Option<i64>) -> Option<Datetime> {
        use chrono::Datelike;

        // get the current time using chrono
        let now = chrono::Local::now();
        let naive = match offset {
            None => now.naive_local(),
            Some(o) => now.naive_utc() + chrono::Duration::try_hours(o)?,
        };

        Datetime::from_ymd(
            naive.year(),
            naive.month().try_into().ok()?,
            naive.day().try_into().ok()?,
        )
    }
}
