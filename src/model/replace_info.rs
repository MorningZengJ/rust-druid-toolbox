use druid::{Data, Lens};

#[derive(Clone, Data, Lens, Default)]
pub struct ReplaceInfo {
    pub content: String,
    pub target: String,
    pub enable: bool,
    pub is_regex: bool,
    pub is_error: bool,
}

impl ReplaceInfo {
    pub fn new() -> Self {
        Self {
            enable: true,
            ..Default::default()
        }
    }
}