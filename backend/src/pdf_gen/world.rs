use std::collections::HashMap;

use super::models::PdfModel;
use typst::{
    diag::{FileError, FileResult},
    foundations::{Bytes, Datetime},
    syntax::{FileId, Source, VirtualPath},
    text::{Font, FontBook},
    utils::LazyHash,
    Library, World,
};

/// Contains the context for rendering PDFs.
pub struct PdfWorld {
    sources: Vec<Source>,
    library: LazyHash<Library>,
    fontbook: LazyHash<FontBook>,
    assets: HashMap<FileId, Bytes>,
    fonts: Vec<Font>,
    main_source: Source,
    input_data: (FileId, Bytes),
}

impl PdfWorld {
    /// Create a new context for rendering PDFs.
    ///
    /// This preloads all files configured in the load_sources, load_fonts and
    /// load_assets functions. Make sure to update their contents if the files
    /// for the templates have changed (this step is manual to ensure that all
    /// template files are actually available).
    pub fn new() -> PdfWorld {
        let sources = load_sources();
        let (fonts, fontbook) = load_fonts();
        let assets = load_assets();
        PdfWorld {
            sources,
            fontbook: LazyHash::new(fontbook),
            fonts,
            assets,
            library: LazyHash::new(Library::builder().build()),
            main_source: Source::new(FileId::new(None, VirtualPath::new("empty.typ")), "".into()),
            input_data: (
                FileId::new(None, VirtualPath::new("input.json")),
                Bytes::new([]),
            ),
        }
    }

    /// Set the input model for this instance.
    ///
    /// The input model defines which template is being used and what the input
    /// for that template is.
    pub fn set_input_model(&mut self, input: PdfModel) {
        let main_source_path = input.as_template_path();
        let main_source = self
            .sources
            .iter()
            .find(|s| s.id().vpath().as_rootless_path() == main_source_path)
            .cloned()
            .expect("could not find input model");
        let input_path = input.as_input_path();
        let input_data = input.get_input().expect("unable to parse JSON into model");
        self.main_source = main_source;
        self.input_data = (FileId::new(None, VirtualPath::new(input_path)), input_data);
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

        // otherwise it must be one of the other files
        self.assets
            .get(&id)
            .cloned()
            .ok_or(FileError::NotFound(id.vpath().as_rootless_path().into()))
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

/// Macro that loads data from a file
/// In a debug build, this is done at runtime, for a release build this is
/// done at compile time.
macro_rules! include_filedata {
    ($path:literal) => {{
        include_bytes!(concat!("../../templates/", $path)) as &'static [u8]
    }};
}

/// Macro that loads data as a string from a file
/// In a debug build, this is done at runtime, for a release build this is
/// done at compile time.
macro_rules! include_strdata {
    ($path:literal) => {{
        include_str!(concat!("../../templates/", $path)) as &'static str
    }};
}

/// Load all sources available from the `templates/` directory (i.e. all typst
/// files).
fn load_sources() -> Vec<Source> {
    macro_rules! include_source {
        ($path:literal) => {
            Source::new(
                FileId::new(None, VirtualPath::new($path)),
                include_strdata!($path).to_string(),
            )
        };
    }

    // We include each template file individually to make sure that all expected files
    // are available. We include these files into the binary in release mode, but
    // read them at runtime on initialization to allow more rapid development on the
    // typst files.
    vec![
        include_source!("common/style.typ"),
        include_source!("common/scripts.typ"),
        include_source!("model-na-31-2.typ"),
    ]
}

/// Load all fonts available from the `fonts/` directory
fn load_fonts() -> (Vec<Font>, FontBook) {
    let mut fonts = vec![];
    let mut fontbook = FontBook::new();

    macro_rules! include_font {
        ($path:literal) => {
            let fontdata = include_filedata!($path);
            let font = Font::new(Bytes::new(fontdata), 0).expect("Error reading font file");
            fontbook.push(font.info().clone());
            fonts.push(font);
        };
    }

    // We include each file individually to make sure that all expected files are available.
    // Note that these font files are only read at font index 0 (i.e. font files with multiple
    // fonts are not supported, split them up in separate files instead)
    // Typst also doesn't support variable fonts at this time, so we cannot use those either.
    include_font!("fonts/DM_Sans/DMSans-Bold.ttf");
    include_font!("fonts/DM_Sans/DMSans-BoldItalic.ttf");
    include_font!("fonts/DM_Sans/DMSans-ExtraBold.ttf");
    include_font!("fonts/DM_Sans/DMSans-ExtraBoldItalic.ttf");
    include_font!("fonts/DM_Sans/DMSans-Italic.ttf");
    include_font!("fonts/DM_Sans/DMSans-Regular.ttf");
    include_font!("fonts/Geist_Mono/GeistMono-Regular.otf");

    (fonts, fontbook)
}

/// Load all assets from the assets directory at `templates/assets`
fn load_assets() -> HashMap<FileId, Bytes> {
    HashMap::new()
}
