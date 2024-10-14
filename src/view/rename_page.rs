use crate::model::app_state::{AppState, RenameState};
use crate::model::file_info::FileInfo;
use crate::traits::directory_choose::DirectoryChoose;
use crate::utils::file_utils::FileUtils;
use druid::commands::SHOW_OPEN_PANEL;
use druid::widget::{Controller, Flex, Label, List, Scroll, TextBox};
use druid::{Env, Event, EventCtx, FileDialogOptions, LensExt, Widget, WidgetExt};

pub fn build_page() -> impl Widget<AppState> {
    Flex::column()
        .with_child(build_dir_path())
        .with_flex_child(build_file_list(), 0.5)
}

fn build_dir_path() -> impl Widget<AppState> {
    let dir_path_label = Label::new("文件路径：")
        .fix_width(100.0)
        .padding(5.0);
    let dir_path_input = TextBox::new()
        .with_placeholder("文件路径")
        .lens(AppState::rename_state.then(RenameState::dir_path))
        .expand_width()
        // .fix_width(500.0)
        .border(druid::Color::BLUE, 1.0)
        .background(druid::Color::rgba8(255, 255, 255, 255))
        .controller(SelectPathController);
    Flex::row()
        .with_child(dir_path_label)
        .with_flex_child(dir_path_input, 0.5)
        .must_fill_main_axis(true)
        .padding(10.0)
}

fn build_file_list() -> impl Widget<AppState> {
    Scroll::new(List::new(|| {
        Label::new(|item: &FileInfo, _env: &Env| format!("{}", item.name))
            .padding(5.0)
    }))
        .lens(AppState::rename_state.then(RenameState::file_list))
}

fn build_regexp_list() -> impl Widget<AppState> {}

// controller
struct SelectPathController;

impl<W: Widget<AppState>> Controller<AppState, W> for SelectPathController {
    fn event(&mut self, child: &mut W, ctx: &mut EventCtx, event: &Event, data: &mut AppState, env: &Env) {
        match event {
            Event::MouseDown(mouse) => {
                if mouse.button.is_left() && mouse.count == 2 {
                    let mut options = FileDialogOptions::new()
                        .select_directories()
                        .title("选择文件夹");
                    if data.rename_state.dir_path.len() > 0 {
                        options = options.force_starting_directory(
                            data.rename_state.dir_path.clone()
                        );
                    }
                    ctx.submit_command(
                        SHOW_OPEN_PANEL.with(options.clone())
                    );
                }
            }
            Event::Command(cmd) => {
                if let Some(file_info) = cmd.get(druid::commands::OPEN_FILE) {
                    if let Some(path) = file_info.path().to_str() {
                        data.rename_state.set_dir_path(path);
                        let vector = FileUtils::list_files(path);
                        data.rename_state.file_list = vector;
                    }
                }
            }
            _ => {}
        }
        child.event(ctx, event, data, env);
    }
}
