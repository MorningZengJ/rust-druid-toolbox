use crate::additional_directory;
use crate::model::file_info::FileInfo;
use crate::model::replace_info::ReplaceInfo;
use crate::traits::directory_choose::DirectoryChoose;
use druid::{Data, Lens};
use im::Vector;

#[derive(Clone, Data, Lens)]
pub struct AppState {
    pub(crate) rename_state: RenameState,

}


#[derive(Clone, Data, Lens)]
pub struct RenameState {
    pub(crate) dir_path: String,
    pub(crate) file_list: Vector<FileInfo>,
    pub(crate) replace_infos: Vector<ReplaceInfo>
}
additional_directory!(RenameState);