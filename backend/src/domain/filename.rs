use chrono::{DateTime, Local};

/// Map Dutch characters with diacritics to their base character
/// <https://nl.wikipedia.org/wiki/Accenttekens_in_de_Nederlandse_spelling#Frequentie>
fn strip_diacritic(c: char) -> char {
    match c {
        'À' | 'Á' | 'Â' | 'Ä' | 'Å' => 'A',
        'à' | 'á' | 'â' | 'ä' | 'å' => 'a',
        'È' | 'É' | 'Ê' | 'Ë' => 'E',
        'è' | 'é' | 'ê' | 'ë' => 'e',
        'Ì' | 'Í' | 'Î' | 'Ï' => 'I',
        'ì' | 'í' | 'î' | 'ï' => 'i',
        'Ò' | 'Ó' | 'Ô' | 'Ö' => 'O',
        'ò' | 'ó' | 'ô' | 'ö' => 'o',
        'Ù' | 'Ú' | 'Û' | 'Ü' => 'U',
        'ù' | 'ú' | 'û' | 'ü' => 'u',
        'Ý' | 'Ŷ' | 'Ÿ' => 'Y',
        'ý' | 'ŷ' | 'ÿ' => 'y',
        'Ç' => 'C',
        'ç' => 'c',
        'Ñ' => 'N',
        'ñ' => 'n',
        other => other,
    }
}

/// Hyphenate a part of the filename:
/// - to lowercase
/// - remove diacritics
/// - replace spaces with hyphens
/// - remove all characters that are not ASCII alphanumeric or hyphen
pub fn hyphenate(authority_region: &str) -> String {
    authority_region
        .to_lowercase()
        .chars()
        .map(strip_diacritic)
        .map(|c| if c == ' ' { '-' } else { c })
        .filter(|c| c.is_ascii_alphanumeric() || *c == '-')
        .collect()
}

/// Slugify a part of the filename:
/// - remove diacritics
/// - replace spaces with underscores
/// - remove all characters that are not ASCII alphanumeric or hyphen or underscore
pub fn slugify(part: &str) -> String {
    part.chars()
        .map(strip_diacritic)
        .map(|c| if c == ' ' { '_' } else { c })
        .filter(|c| c.is_ascii_alphanumeric() || *c == '-' || *c == '_')
        .collect()
}

/// Format a DateTime to append to a filename: yymmdd-hhmmss
pub fn format_datetime(datetime: DateTime<Local>) -> String {
    datetime.format("%Y%m%d-%H%M%S").to_string()
}

#[cfg(test)]
mod tests {
    use chrono::{Local, TimeZone};

    use super::*;

    #[test]
    fn test_hyphenate() {
        #[rustfmt::skip]
        let test_cases = [
            ("Utrecht", "utrecht"),
            ("'s-Hertogenbosch", "s-hertogenbosch"),
            ("Reusel-De Mierden", "reusel-de-mierden"),
            ("Nuenen, Gerwen en Nederwetten", "nuenen-gerwen-en-nederwetten"),
            ("Nuenen c.a.", "nuenen-ca"),
            ("Súdwest-Fryslân", "sudwest-fryslan"),
            ("Waterschap De 13 slootjes", "waterschap-de-13-slootjes"),
        ];

        for (region, expected) in test_cases {
            assert_eq!(hyphenate(region), expected);
        }
    }

    #[test]
    fn test_slugify() {
        #[rustfmt::skip]
        let test_cases = [
            ("Utrecht", "Utrecht"),
            ("'s-Hertogenbosch", "s-Hertogenbosch"),
            ("Reusel-De Mierden", "Reusel-De_Mierden"),
            ("Nuenen, Gerwen en Nederwetten", "Nuenen_Gerwen_en_Nederwetten"),
            ("Nuenen c.a.", "Nuenen_ca"),
            ("Súdwest-Fryslân", "Sudwest-Fryslan"),
        ];

        for (part, expected) in test_cases {
            assert_eq!(slugify(part), expected);
        }
    }

    #[test]
    fn test_format_datetime() {
        let datetime = Local.with_ymd_and_hms(2026, 9, 1, 10, 20, 30).unwrap();
        assert_eq!(format_datetime(datetime), "20260901-102030");
    }
}
