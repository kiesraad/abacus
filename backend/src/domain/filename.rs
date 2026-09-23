use chrono::{DateTime, Local};

/// Map Dutch lowercase characters with diacritics to their base character
/// <https://nl.wikipedia.org/wiki/Accenttekens_in_de_Nederlandse_spelling#Frequentie>
fn strip_diacritic(c: char) -> char {
    match c {
        'à' | 'á' | 'â' | 'ä' | 'å' => 'a',
        'è' | 'é' | 'ê' | 'ë' => 'e',
        'ì' | 'í' | 'î' | 'ï' => 'i',
        'ò' | 'ó' | 'ô' | 'ö' => 'o',
        'ù' | 'ú' | 'û' | 'ü' => 'u',
        'ý' | 'ŷ' | 'ÿ' => 'y',
        'ç' => 'c',
        'ñ' => 'n',
        other => other,
    }
}

/// Remove diacritics, preserve inner hyphens, spaces become "-", all lowercase
pub fn hyphenate(authority_region: &str) -> String {
    authority_region
        .to_lowercase()
        .chars()
        .map(strip_diacritic)
        .map(|c| if c == ' ' { '-' } else { c })
        .filter(|c| c.is_alphabetic() || *c == '-')
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
        ];

        for (region, expected) in test_cases {
            assert_eq!(hyphenate(region), expected);
        }
    }

    #[test]
    fn test_format_datetime() {
        let datetime = Local.with_ymd_and_hms(2026, 9, 1, 10, 20, 30).unwrap();
        assert_eq!(format_datetime(datetime), "20260901-102030");
    }
}
