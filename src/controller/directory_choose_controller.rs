use crate::controller::controllers::Controllers;
use crate::model::app_state::AppState;
use crate::traits::directory_choose::DirectoryChoose;
use crate::utils::file_utils::FileUtils;
use druid::commands::SHOW_OPEN_PANEL;
use druid::widget::Controller;
use druid::{Data, Env, Event, EventCtx, FileDialogOptions, Selector, UpdateCtx, Widget};

pub struct DirectoryChooseController;

impl DirectoryChooseController {
    const LIST_FILE: Selector<String> = Selector::new("druid-builtin. menu-file-open");

    pub fn choose() -> Controllers<AppState, fn(&mut EventCtx, &mut AppState, &Env)> {
        Controllers {
            mouse_move: None,
            mouse_dblclick: Some(|ctx: &mut EventCtx, data: &mut AppState, _env: &Env| {
                let mut options = FileDialogOptions::new()
                    .select_directories()
                    .title("选择文件夹");
                if data.rename_state.dir_path.len() > 0 {
                    options = options.force_starting_directory(data.rename_state.dir_path.clone());
                }
                ctx.submit_command(SHOW_OPEN_PANEL.with(options.clone()));
            }),
            command: None,
            _marker: Default::default(),
        }
    }
}

impl<W: Widget<AppState>> Controller<AppState, W> for DirectoryChooseController {
    fn event(&mut self, child: &mut W, ctx: &mut EventCtx, event: &Event, data: &mut AppState, env: &Env) {
        match event {
            Event::Command(cmd) => {
                if let Some(file_info) = cmd.get(druid::commands::OPEN_FILE) {
                    if let Some(path) = file_info.path().to_str() {
                        data.rename_state.set_dir_path(path);
                    }
                }
                if let Some(_) = cmd.get(Self::LIST_FILE) {
                    let vector = FileUtils::list_files(&data.rename_state.dir_path);
                    data.rename_state.file_list = vector;
                }
            }
            _ => {}
        }
        child.event(ctx, event, data, env);
    }

    fn update(&mut self, child: &mut W, ctx: &mut UpdateCtx, old_data: &AppState, data: &AppState, env: &Env) {
        let path = data.rename_state.dir_path.clone();
        if old_data.rename_state.dir_path.same(&path) {
            return;
        }
        ctx.submit_command(Self::LIST_FILE.with(path));
        child.update(ctx, old_data, data, env);
    }
}

