use pdf_gen::{FontData, SourceFile};

/// Macro that loads data from a file
/// In a debug build, this is done at runtime, for a release build this is
/// done at compile time.
macro_rules! include_filedata {
    ($path:expr) => {{ include_bytes!(concat!("../../../templates/", $path)) as &'static [u8] }};
}

/// Macro that loads data as a string from a file
/// In a debug build, this is done at runtime, for a release build this is
/// done at compile time.
macro_rules! include_strdata {
    ($path:expr) => {{ include_str!(concat!("../../../templates/", $path)) as &'static str }};
}

/// Load all sources available from the `templates/` directory (i.e. all typst
/// files).
pub(super) fn load_sources() -> Vec<SourceFile> {
    macro_rules! include_source {
        ($path:expr) => {
            SourceFile {
                path: $path,
                content: include_strdata!($path),
            }
        };
    }

    // We include each template file individually to make sure that all expected files
    // are available. We include these files into the binary in release mode, but
    // read them at runtime on initialization to allow more rapid development on the
    // typst files.
    vec![
        include_source!("common/scripts.typ"),
        include_source!("common/style.typ"),
        include_source!("model-n-10-2.typ"),
        include_source!("model-na-14-2.typ"),
        include_source!("model-na-14-2-bijlage1.typ"),
        include_source!("model-na-31-2.typ"),
        include_source!("model-na-31-2-bijlage1.typ"),
        include_source!("model-na-31-2-inlegvel.typ"),
        include_source!("model-p-2a.typ"),
        #[cfg(test)]
        include_source!("test-teletex-charset.typ"),
        #[cfg(test)]
        include_source!("test-unsupported-chars.typ"),
    ]
}

/// Load all fonts available from the `fonts/` directory
pub(super) fn load_fonts() -> Vec<FontData> {
    let mut fonts = vec![];

    macro_rules! include_font {
        ($path:literal) => {
            let font = FontData(include_filedata!(concat!("fonts/", $path)));
            fonts.push(font);
        };
    }

    // We include each file individually to make sure that all expected files are available.
    // Note that these font files are only read at font index 0 (i.e. font files with multiple
    // fonts are not supported, split them up in separate files instead)
    // Typst also doesn't support variable fonts at this time, so we cannot use those either.
    include_font!("DM_Sans/DMSans-Bold.ttf");
    include_font!("DM_Sans/DMSans-BoldItalic.ttf");
    include_font!("DM_Sans/DMSans-ExtraBold.ttf");
    include_font!("DM_Sans/DMSans-ExtraBoldItalic.ttf");
    include_font!("DM_Sans/DMSans-Italic.ttf");
    include_font!("DM_Sans/DMSans-Regular.ttf");
    include_font!("Geist_Mono/GeistMono-Regular.otf");

    fonts
}
