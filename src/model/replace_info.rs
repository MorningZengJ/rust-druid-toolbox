use druid::{Data, Lens};
use uuid::Uuid;

#[derive(Clone, Lens, Default)]
pub struct ReplaceInfo {
    pub(crate) id: Uuid,
    pub(crate) content: String,
    pub(crate) target: String,
    pub(crate) enable: bool,
    pub(crate) is_regex: bool,
    pub(crate) is_error: bool,
}

impl ReplaceInfo {
    pub fn new() -> Self {
        Self {
            id: Uuid::new_v4(),
            enable: true,
            ..Default::default()
        }
    }
}

impl Data for ReplaceInfo {
    fn same(&self, other: &Self) -> bool {
        self.id.to_string() == other.id.to_string()
            && self.content == other.content
            && self.target == other.target
            && self.enable == other.enable
            && self.is_regex == other.is_regex
            && self.is_error == other.is_error
    }
}
