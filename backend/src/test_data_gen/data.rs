use std::sync::{
    OnceLock,
    atomic::{AtomicU64, Ordering},
};

use chrono::{DateTime, Days, NaiveDate, TimeDelta, Utc};
use rand::seq::{IndexedRandom, SliceRandom};

/// List of first names to select from
const FIRST_NAMES: &[&str] = &[
    "Jory",
    "Rachid",
    "Leontien",
    "Royce",
    "Sibel",
    "Nicolaas",
    "Sammie",
    "Bart",
    "Ruth",
    "Florien",
    "Edis",
    "Kris",
    "Nikky",
    "Henk",
    "Tiemen",
    "Sijtze",
    "Gijsbertje",
    "Silvana",
    "Eelko",
    "Cornelus",
    "Christina",
    "Damian",
    "Renso",
    "Alek",
    "Esra",
    "Teun",
    "Salomon",
    "Jelisa",
    "Dirk-Jan",
    "Madelène",
    "İlknur",
    "Yağmur",
];

/// Generate a first name using the random number generator given
pub fn first_name(rng: &mut impl rand::Rng) -> &'static str {
    FIRST_NAMES.choose(rng).expect("Missing test data")
}

/// Helper function that generates some additional initials
fn gen_initials_helper(rng: &mut impl rand::Rng, mut offset: u32) -> String {
    let mut initials = String::new();

    loop {
        // That's enough initials!
        if offset > 5 {
            break;
        }

        if rng.random_ratio(1, offset + 1) {
            initials.push_str(&format!("{}.", rng.random_range('A'..='Z')));
            offset += 1;
        } else {
            break;
        }
    }

    initials
}

/// Generate some initials, given some optional first name using the
/// random number generator given. If the first name is provided most
/// of the time the first letter of the first name will be used as the
/// first initial.
pub fn initials(rng: &mut impl rand::Rng, first_name: Option<&str>) -> String {
    if let Some(first_name) = first_name {
        if first_name.trim().is_empty() || rng.random_ratio(1, 8) {
            // either we have no name, or we want some random initials
            gen_initials_helper(rng, 0)
        } else {
            // use the first letter as the first initial
            let first_letter = first_name.chars().next().expect("Missing test data");
            let rest_initials = gen_initials_helper(rng, 1);
            format!("{first_letter}.{rest_initials}")
        }
    } else {
        // no first name, make something up
        gen_initials_helper(rng, 0)
    }
}

/// List of last names to select from
const LAST_NAMES: &[(Option<&str>, &str)] = &[
    (None, "Boermans"),
    (Some("van de"), "Kerkhof"),
    (None, "Prakken"),
    (None, "Born"),
    (None, "Brienen"),
    (Some("van"), "Bekking"),
    (Some("van de"), "Wal"),
    (None, "Tax"),
    (Some("van"), "Lent"),
    (Some("van"), "Jaspers-Gezen"),
    (None, "Meulenkolk"),
    (None, "Katsma"),
    (Some("den"), "Mateman"),
    (None, "Cornelis"),
    (Some("van der"), "Spek"),
    (None, "Arets"),
    (None, "Gopal"),
    (None, "Wolfswinkel"),
    (None, "Oorschot"),
    (None, "Hoogstraten"),
    (None, "Philippen"),
    (None, "Goedhart"),
    (Some("van der"), "Meulen"),
    (None, "Wiertz"),
    (Some("de"), "Vegt"),
    (None, "Groenen"),
    (None, "Aygün"),
    (None, "Bruins-Van den Kerk"),
    (None, "Titulaer"),
    (None, "Güneş"),
];

/// Generate a last name and an optional last name prefix using the random number generator given
pub fn last_name(rng: &mut impl rand::Rng) -> (Option<&'static str>, &'static str) {
    let (prefix, last_name) = LAST_NAMES.choose(rng).expect("Missing test data");
    (*prefix, last_name)
}

const LOCALITIES: &[&str] = &[
    "Heemdamseburg",
    "Juinen",
    "Middelgein",
    "'s Gravenveen",
    "Sluisdam",
    "Hovenerwoud",
    "Bloemstede",
    "Eksterlo",
    "Eemstricht",
    "Hoek van Zoom",
    "Lekkum",
    "Huisden",
];

/// Generate a random locality, using the random number generator given
pub fn locality(rng: &mut impl rand::Rng) -> &'static str {
    LOCALITIES.choose(rng).expect("Missing test data")
}

const STREETNAMES: &[&str] = &[
    "Dorpsstraat",
    "Kerkstraat",
    "Molenweg",
    "Stationsweg",
    "Schoolstraat",
    "Molenstraat",
    "Parallelweg",
    "Sportlaan",
    "Industrieweg",
    "Grote Markt",
    "Beukenlaan",
    "Nieuwstraat",
    "Kortestraat",
    "Langestraat",
    "Bredestraat",
];

/// Generate a random streetname and house number combination, using the random number generator given
pub fn address(rng: &mut impl rand::Rng) -> String {
    let street = STREETNAMES.choose(rng).expect("Missing test data");

    let housenumber = rng.random_range(1..=120);
    let ext = if rng.random_ratio(1, 5) {
        ["a", "b", "c", "d"].choose(rng).expect("Missing test data")
    } else {
        ""
    };

    format!("{street} {housenumber}{ext}")
}

/// Generate a random postal code, using the random number generator given
pub fn postal_code(rng: &mut impl rand::Rng) -> String {
    let digits = rng.random_range(1000..10000).to_string();
    let letter1 = rng.random_range('A'..='Z');
    let letter2 = rng.random_range('A'..='Z');
    format!("{digits}{letter1}{letter2}")
}

const POLITICAL_GROUP_NAMES: &[&str] = &[
    "Partijdige Partij",
    "Partij voor de Stemmer",
    "Stemmmers 22",
    "STEM",
    "De Stemunie",
    "Stemalliantie",
    "Lijst De Partij",
    "Het Stembiljet",
    "Partij voor de Opkomst",
    "Kiezers nu!",
    "Verkiespartij",
    "WET",
    "Partij van de Wet",
    "Stem van de partij",
    "Kiesregelingsunie",
    "De Lijst",
    "Groep De Partij",
    "Stemmersgroep",
    "Algemene Partij",
    "Stem voor de Partij",
    "Partij van de Keuze",
    "KEUS",
    "Keuzepartij",
    "Voorkeurskeuzepartij",
    "De Kandidatenlijst",
    "Lijst van de Kandidaten",
    "Kandidaten eerst!",
    "De Kandidaat",
    "Politieke Groep de Partij",
    "De partijdigen",
    "Doorstemmers",
    "Politieke Groep der Kandidaten",
    "Groep van de Stemmers",
    "Unie voor Stemmen",
    "Alliantie van Partijen",
    "Stem voor kandidaten",
    "Kandidaten voor stemmen",
    "Partij voor de Kiesregeling",
    "De Kiezer",
    "Stemmers eerst!",
    "LIJST",
    "Algemene Lijst",
    "Lijst de stemmer",
    "Partij van de groepen",
    "Lijst van stemmers",
    "Stemmers 101",
    "Lijst voor de Partijdigheid",
    "Unie van kandidaten",
    "Stem nu!",
    "Altijd van de Partij",
];

static PG_OFFSET: AtomicU64 = AtomicU64::new(0);

/// Generate a random political group name. This should not repeat political group names.
/// This only uses the random number generator on the initial call to shuffle the list of
/// political group names. If the list is exhausted, a simple "GROEP x" is returned.
pub fn political_group_name(rng: &mut impl rand::Rng) -> String {
    static RAND_POLITICAL_GROUP_NAMES: OnceLock<Vec<&str>> = OnceLock::new();

    let offset = usize::try_from(PG_OFFSET.fetch_add(1, Ordering::Relaxed)).unwrap_or(usize::MAX);
    if offset >= POLITICAL_GROUP_NAMES.len() {
        let idx = offset - POLITICAL_GROUP_NAMES.len() + 1;
        format!("GROEP {idx}")
    } else {
        let rpgs = RAND_POLITICAL_GROUP_NAMES.get_or_init(|| {
            let mut v = Vec::from(POLITICAL_GROUP_NAMES);
            v.shuffle(rng);
            v
        });
        rpgs[offset].to_owned()
    }
}

const POLLING_STATION_PREFIX: &[&str] = &[
    "Buurthuis",
    "Clubhuis",
    "Openbare Basisschool",
    "OBS",
    "Hotel",
    "Museum",
    "Cultuurcentrum",
    "Café",
    "Sportzaal",
    "Steunpunt",
    "Wijkcentrum",
    "Winkelcentrum",
    "Sportcomplex",
    "Studio",
    "Theater",
    "Filmhuis",
    "Bioscoop",
];

const POLLING_STATION_SUFFIX: &[&str] = &[
    "Het Stemmende Vogeltje",
    "De Vliegende Stemmer",
    "De Gang",
    "Het Gebouw",
    "De Deur",
    "De Kiezende Olifant",
    "Voor het Hek",
    "Door de Kamer",
    "De Tweede Kamer",
    "Het Binnenhof",
    "Voor het Veld",
    "Het Pronkstuk",
    "Den Echte Stemmer",
    "Het Vriendelijke Bureau",
    "Achter Het Huis",
    "Van Den Stem",
    "Het Gemeentehuis",
    "De Genieter",
    "De Doorstemmer",
    "Het Kleurende Potlood",
    "Het Potlood",
    "De Sprankelende Stembus",
    "Achter De Stembus",
    "Via De Stemgang",
];

/// Generate a polling station name, using the random number generator given
pub fn polling_station_name(rng: &mut impl rand::Rng) -> String {
    let prefix = POLLING_STATION_PREFIX
        .choose(rng)
        .expect("Missing test data");
    let suffix = POLLING_STATION_SUFFIX
        .choose(rng)
        .expect("Missing test data");
    let add_quotes = rng.random_ratio(1, 10);
    if add_quotes {
        if rng.random_ratio(1, 2) {
            format!("{prefix} '{suffix}'")
        } else {
            format!("{prefix} \"{suffix}\"")
        }
    } else {
        format!("{prefix} {suffix}")
    }
}

/// Generate a random election domain id using the given random number generator
pub fn domain_id(rng: &mut impl rand::Rng) -> String {
    let num = rng.random_range(100..1000);
    format!("{num:04}")
}

/// Pick a date between the two given dates, using the given random number generator
pub fn date_between(rng: &mut impl rand::Rng, start: NaiveDate, end: NaiveDate) -> NaiveDate {
    assert!(end >= start, "Start date should be before end date");
    let delta = end - start;
    let days = delta.num_days();
    if days <= 0 {
        return start;
    }
    let rand = rng.random_range(0..days);
    start + Days::new(rand as u64)
}

/// Generate some datetime from some point in time and a duration from that point in time
/// The duration may not exceed about 292 years.
pub fn datetime_around(
    rng: &mut impl rand::Rng,
    point_in_time: DateTime<Utc>,
    duration: TimeDelta,
) -> DateTime<Utc> {
    let nanos = if duration > TimeDelta::zero() {
        rng.random_range(0..=duration.num_nanoseconds().unwrap_or(i64::MAX))
    } else {
        rng.random_range(duration.num_nanoseconds().unwrap_or(i64::MIN)..=0)
    };
    point_in_time + TimeDelta::nanoseconds(nanos)
}
