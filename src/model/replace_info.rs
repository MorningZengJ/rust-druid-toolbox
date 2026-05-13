use uuid::Uuid;

#[derive(Clone, Default, Debug)]
pub struct ReplaceInfo {
    pub id: Uuid,
    pub content: String,
    pub target: String,
    pub enable: bool,
    pub is_regex: bool,
    pub is_error: bool,
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

impl PartialEq for ReplaceInfo {
    fn eq(&self, other: &Self) -> bool {
        self.id == other.id
    }
}
