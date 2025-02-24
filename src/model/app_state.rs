use crate::model::music_state::MusicState;
use crate::model::rename_state::RenameState;
use crate::traits::directory_choose::DirectoryChoose;
use druid::{Data, Lens};

#[derive(Clone, Data, Lens, Default)]
pub struct AppState {
    pub(crate) rename_state: RenameState,
    pub(crate) music_state: MusicState,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            rename_state: RenameState::new(),
            music_state: MusicState::new(),
        }
    }
}