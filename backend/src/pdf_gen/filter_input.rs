use std::sync::OnceLock;
use ttf_parser::Face;

const TOFU: char = '□';

static FONT: OnceLock<Face<'static>> = OnceLock::new();
static FONT_BYTES: &[u8] =
    include_bytes!("../../../backend/templates/fonts/DM_Sans/DMSans-Regular.ttf");
// static FONT_BYTES: &[u8] = include_bytes!("../../../backend/templates/fonts/Arial/Arial.ttf");

fn get_font() -> &'static Face<'static> {
    FONT.get_or_init(|| Face::parse(FONT_BYTES, 0).expect("Failed to parse font"))
}

// Load the font face once and reuse it
pub(super) fn replace_unsupported_glyphs(input: String) -> String {
    let face: &'static Face<'static> = get_font();
    input
        .chars()
        .map(|ch| {
            if ch.is_ascii() || face.glyph_index(ch).is_some() {
                ch
            } else {
                eprintln!("Replacing unsupported character: {:#06x}", ch as u32);
                TOFU
            }
        })
        .collect()
}
