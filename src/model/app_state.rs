use crate::additional_directory;
use crate::model::file_info::FileInfo;
use crate::traits::directory_choose::DirectoryChoose;
use crate::traits::impl_data::Vector;
use druid::{Data, Lens};

#[derive(Clone, Data, Lens)]
pub struct AppState {
    pub(crate) rename_state: RenameState,

}


#[derive(Clone, Data, Lens)]
pub struct RenameState {
    pub(crate) dir_path: String,
    pub(crate) file_list: Vector<FileInfo>,
}
additional_directory!(RenameState);