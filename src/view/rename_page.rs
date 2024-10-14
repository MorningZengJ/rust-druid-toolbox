use crate::enums::material_icon::MaterialIcon;
use crate::model::app_state::{AppState, RenameState};
use crate::model::file_info::FileInfo;
use crate::model::replace_info::ReplaceInfo;
use crate::traits::directory_choose::DirectoryChoose;
use crate::utils::file_utils::FileUtils;
use druid::commands::SHOW_OPEN_PANEL;
use druid::widget::{Button, Checkbox, Controller, Flex, Label, List, Scroll, TextBox};
use druid::{Data, Env, Event, EventCtx, FileDialogOptions, Lens, LensExt, Selector, UpdateCtx, Widget, WidgetExt};

pub fn build_page() -> impl Widget<AppState> {
    Flex::column()
        .with_child(build_dir_path())
        .with_flex_child(build_file_list(), 0.5)
        .with_flex_child(build_replace_info_list(), 0.5)
        .with_child(build_buttons())
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
        .vertical()
        .lens(AppState::rename_state.then(RenameState::file_list))
        .expand()
}

fn build_replace_info_list() -> impl Widget<AppState> {
    Scroll::new(List::new(move || {
        let content_input = TextBox::new()
            .with_placeholder("请输入替换内容")
            .lens(ReplaceInfo::content)
            .expand_width();
        let target_input = TextBox::new()
            .with_placeholder("请输入目标内容")
            .lens(ReplaceInfo::target)
            .expand_width();
        let enable_checkbox = Checkbox::new("启用")
            .lens(ReplaceInfo::enable);
        let regex_checkbox = Checkbox::new("正则")
            .lens(ReplaceInfo::is_regex);

        Flex::row()
            .with_spacer(10.0)
            .with_flex_child(content_input, 0.5)
            .with_child(MaterialIcon::LastPage.load().padding(10.0))
            .with_flex_child(target_input, 0.5)
            .with_spacer(10.0)
            .with_child(enable_checkbox)
            .with_spacer(10.0)
            .with_child(regex_checkbox)
            .with_spacer(10.0)
            .expand_width()
    }))
        .vertical()
        .lens(AppState::rename_state.then(RenameState::replace_infos))
        .expand()
}

fn build_buttons() -> impl Widget<AppState> {
    // 创建第一个按钮
    let button1 = Button::new("Button 1").on_click(|_ctx, _data: &mut AppState, _env| {
        // 按钮1的点击处理逻辑
        println!("Button 1 clicked");
    });

    // 创建第二个按钮
    let button2 = Button::new("Button 2").on_click(|_ctx, _data: &mut AppState, _env| {
        // 按钮2的点击处理逻辑
        println!("Button 2 clicked");
    });

    // 将按钮添加到水平布局中
    Flex::row()
        .with_child(button1)
        .with_spacer(8.0)
        .with_child(button2)
}

// controller
struct SelectPathController;

impl SelectPathController {
    const LIST_FILE: Selector<String> = Selector::new("druid-builtin. menu-file-open");
}

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
        if (old_data.rename_state.dir_path.same(&path)) {
            return;
        }
        ctx.submit_command(Self::LIST_FILE.with(path));
        child.update(ctx, old_data, data, env);
    }
}
