use std::sync::OnceLock;

use ttf_parser::Face;

const TOFU: char = '\u{fffd}';

static FONT: OnceLock<Face<'static>> = OnceLock::new();
static FONT_BYTES: &[u8] = include_bytes!("../../../templates/fonts/DM_Sans/DMSans-Regular.ttf");

fn get_font() -> &'static Face<'static> {
    FONT.get_or_init(|| Face::parse(FONT_BYTES, 0).expect("Failed to parse font"))
}

/// Replace unsupported glyphs in the input string with a placeholder character.
pub fn replace_unsupported_glyphs(input: String) -> String {
    let face: &'static Face<'static> = get_font();
    input
        .chars()
        .map(|ch| {
            if ch.is_ascii() || face.glyph_index(ch).is_some() {
                ch
            } else {
                TOFU
            }
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use test_log::test;

    use super::*;

    #[test(tokio::test)]
    async fn the_default_font_supports_teletex_chars() {
        // See backend/templates/inputs/test-teletex-charset.json for the list of characters that are expected to be supported.
        let input = (32..127)
            .map(|codepoint| char::from_u32(codepoint).unwrap())
            .collect::<String>();

        let filtered_input = replace_unsupported_glyphs(input.clone());
        assert_eq!(input, filtered_input);

        let input = (161..383)
            .map(|codepoint| char::from_u32(codepoint).unwrap())
            .collect::<String>();

        let filtered_input = replace_unsupported_glyphs(input.clone());
        assert_eq!(input, filtered_input);
    }
}
