use chrono::{DateTime, Local};

/// Format a DateTime to append to a filename: yymmdd-hhmmss
pub fn format_datetime(datetime: DateTime<Local>) -> String {
    datetime.format("%Y%m%d-%H%M%S").to_string()
}

#[cfg(test)]
mod tests {
    use chrono::{Local, TimeZone};

    use super::*;

    #[test]
    fn test_format_datetime() {
        let datetime = Local.with_ymd_and_hms(2026, 9, 1, 10, 20, 30).unwrap();
        assert_eq!(format_datetime(datetime), "20260901-102030");
    }
}
