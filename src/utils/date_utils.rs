use chrono::{TimeZone, Utc};

pub struct DateUtils;

impl DateUtils {
    pub const YYYY_MM_DD_HH_MM_SS: &'static str = "%Y-%m-%d %H:%M:%S";
    pub const YYYY_MM_DD_HH_MM: &'static str = "%Y-%m-%d %H:%M";
    pub const YYYY_MM_DD: &'static str = "%Y-%m-%d";


    pub fn format(timestamp: u64) -> String {
        Self::format_by_pattern(timestamp, Self::YYYY_MM_DD_HH_MM_SS)
    }

    //noinspection SpellCheckingInspection
    pub fn format_by_pattern(timestamp: u64, pattern: &'static str) -> String {
        let secs = (timestamp / 1000) as i64;
        let nsecs = ((timestamp % 1000) * 1_000_000) as u32;
        if let Some(datetime) = Utc.timestamp_opt(secs, nsecs).single() {
            return datetime.format(pattern).to_string();
        }
        "0000-00-00 00:00:00".to_string()
    }
}