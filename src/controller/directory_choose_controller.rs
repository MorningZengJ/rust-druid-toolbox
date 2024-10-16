use crate::controller::controllers::Controllers;
use crate::model::app_state::AppState;
use crate::traits::directory_choose::DirectoryChoose;
use crate::utils::file_utils::FileUtils;
use druid::commands::SHOW_OPEN_PANEL;
use druid::{Data, Env, Event, EventCtx, FileDialogOptions, Selector, UpdateCtx};

pub struct DirectoryChooseController;

impl DirectoryChooseController {
    const LIST_FILE: Selector<String> = Selector::new("toolbox-builtin. menu-file-open");

    pub fn choose() -> Controllers<AppState, fn(&mut EventCtx, &mut AppState, &Env, &Event), fn(&mut UpdateCtx, &AppState, &AppState)> {
        Controllers {
            mouse_dblclick: Some(|ctx: &mut EventCtx, data: &mut AppState, _env: &Env, event| {
                let mut options = FileDialogOptions::new()
                    .select_directories()
                    .title("选择文件夹");
                if data.rename_state.dir_path.len() > 0 {
                    options = options.force_starting_directory(data.rename_state.dir_path.clone());
                }
                ctx.submit_command(SHOW_OPEN_PANEL.with(options.clone()));
            }),
            command: Some(|ctx, data, _env, event| {
                if let Event::Command(cmd) = event {
                    if let Some(file_info) = cmd.get(druid::commands::OPEN_FILE) {
                        if let Some(path) = file_info.path().to_str() {
                            data.rename_state.set_dir_path(path);
                        }
                    }
                    if let Some(_) = cmd.get(Self::LIST_FILE) {
                        let vector = FileUtils::list_files(&data.rename_state.dir_path);
                        data.rename_state.file_list = vector;
                        data.rename_state.get_filter_file_list();
                    }
                }
            }),
            update: Some(|ctx, old, data| {
                let path = data.rename_state.dir_path.clone();
                if old.rename_state.dir_path.same(&path) {
                    return;
                }
                ctx.submit_command(Self::LIST_FILE.with(path));
            }),
            ..Default::default()
        }
    }
}

