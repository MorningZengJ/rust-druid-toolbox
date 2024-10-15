use crate::controller::mouse_controller::MouseController;
use crate::enums::material_icon::MaterialIcon;
use crate::model::app_state::{AppState, RenameState};
use crate::model::file_info::FileInfo;
use crate::model::replace_info::ReplaceInfo;
use crate::traits::directory_choose::DirectoryChoose;
use crate::utils::file_utils::FileUtils;
use druid::commands::SHOW_OPEN_PANEL;
use druid::lens::Map;
use druid::widget::{Checkbox, Controller, Flex, Label, LineBreaking, List, Painter, Scroll, Split, TextBox};
use druid::{Color, Cursor, Data, Env, Event, EventCtx, FileDialogOptions, LensExt, RenderContext, Selector, UpdateCtx, Widget, WidgetExt};
use im::Vector;
use regex::Regex;

pub fn build_page() -> impl Widget<AppState> {
    Flex::column()
        .with_child(build_dir_path())
        .with_flex_child(build_split_files(), 0.5)
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
        .border(Color::BLUE, 1.0)
        .background(Color::rgba8(255, 255, 255, 255))
        .controller(SelectPathController);
    Flex::row()
        .with_child(dir_path_label)
        .with_flex_child(dir_path_input, 0.5)
        .must_fill_main_axis(true)
        .padding(10.0)
}

fn build_split_files() -> impl Widget<AppState> {
    Split::columns(build_left_file_list(), build_right_file_list())
        .draggable(true)
        .split_point(0.5)
}

fn build_left_file_list() -> impl Widget<AppState> {
    Scroll::new(List::new(|| {
        Label::new(|item: &FileInfo, _env: &Env| format!("{}", item.name))
            .with_line_break_mode(LineBreaking::WordWrap)
            .padding(5.0)
    }))
        .vertical()
        .lens(AppState::rename_state.then(RenameState::file_list))
        .expand()
}

fn build_right_file_list() -> impl Widget<AppState> {
    Scroll::new(List::new(|| {
        Label::new(|(item, replace_infos): &(FileInfo, Vector<ReplaceInfo>), _env: &Env| {
            let mut text = item.name.clone();
            let mut infos = replace_infos.clone();
            for info in infos.iter_mut() {
                if info.enable {
                    text = if info.is_regex {
                        match Regex::new(&*info.content) {
                            Ok(regex) => regex.replace_all(&*item.name, info.target.clone()).to_string(),
                            Err(_) => text
                        }
                    } else {
                        item.name.replace(&*info.content, &*info.target)
                    };
                }
            }
            text
        })
            .with_line_break_mode(LineBreaking::WordWrap)
            .padding(5.0)
    }))
        .vertical()
        .lens(AppState::rename_state.then(Map::new(
            |rename_state: &RenameState| {
                rename_state.file_list.iter().cloned()
                    .map(|file_info| (file_info, rename_state.replace_infos.clone()))
                    .collect::<Vector<_>>()
            },
            |_: &mut RenameState, _: Vector<(FileInfo, Vector<ReplaceInfo>)>| {},
        )))
        .expand()
}

fn build_replace_info_list() -> impl Widget<AppState> {
    Scroll::new(List::new(move || {
        let painter = Painter::new(|ctx, data: &ReplaceInfo, _env| {
            let rect = ctx.size().to_rect();
            let color = if data.is_error { Color::RED } else { Color::YELLOW };
            ctx.stroke(rect, &color, 2.0);
        });

        let content_input = TextBox::new()
            .with_placeholder("请输入替换内容")
            .lens(ReplaceInfo::content)
            .expand_width()
            .background(painter);
        let target_input = TextBox::new()
            .with_placeholder("请输入目标内容")
            .lens(ReplaceInfo::target)
            .expand_width();
        let enable_checkbox = Checkbox::new("启用")
            .lens(ReplaceInfo::enable);
        let regex_checkbox = Checkbox::new("正则")
            .lens(ReplaceInfo::is_regex)
            .controller(RegexController);

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
    let mouse_controller = MouseController {
        mouse_move: Some(|ctx: &mut EventCtx, data: &mut AppState, _env: &Env| {
            ctx.set_cursor(&Cursor::Pointer)
        }),
        mouse_dblclick: None,
        _marker: Default::default(),
    };
    // 创建第一个按钮
    let button1 = MaterialIcon::PlaylistAdd.load()
        .border(Color::WHITE, 0.3)
        .rounded(3.0)
        .controller(mouse_controller.clone())
        .on_click(|_ctx, _data: &mut AppState, _env| {
            // 按钮2的点击处理逻辑
            println!("Button 1 clicked");
        });

    // 创建第二个按钮
    let button2 = MaterialIcon::BorderColor.load()
        .border(Color::WHITE, 0.3)
        .rounded(3.0)
        .controller(mouse_controller.clone())
        .on_click(|_ctx, _data: &mut AppState, _env| {
            // 按钮2的点击处理逻辑
            println!("Button 2 clicked");
        });

    // 将按钮添加到水平布局中
    Flex::row()
        .with_child(button1)
        .with_spacer(20.0)
        .with_child(button2)
        .padding(10.0)
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
        if old_data.rename_state.dir_path.same(&path) {
            return;
        }
        ctx.submit_command(Self::LIST_FILE.with(path));
        child.update(ctx, old_data, data, env);
    }
}

struct RegexController;

impl RegexController {
    const REGEX_CHANGE: Selector<bool> = Selector::new("druid-builtin. regex-change");
}

impl<W: Widget<ReplaceInfo>> Controller<ReplaceInfo, W> for RegexController {
    fn event(&mut self, child: &mut W, ctx: &mut EventCtx, event: &Event, data: &mut ReplaceInfo, env: &Env) {
        if let Event::Command(cmd) = event {
            if let Some(is_regex) = cmd.get(RegexController::REGEX_CHANGE) {
                data.is_regex = *is_regex;
                ctx.request_paint();
            }
        }
        child.event(ctx, event, data, env);
    }

    fn update(&mut self, child: &mut W, ctx: &mut UpdateCtx, old_data: &ReplaceInfo, data: &ReplaceInfo, env: &Env) {
        let mut is_error = data.is_error;
        if old_data.is_regex != data.is_regex {
            is_error = data.is_regex && matches!(Regex::new(&*data.content),Err(_));
        } else if old_data.content != data.content {
            is_error = data.is_regex && matches!(Regex::new(&*data.content),Err(_));
        }
        if data.is_error != is_error {
            ctx.submit_command(Self::REGEX_CHANGE.with(is_error));
        }
        child.update(ctx, old_data, data, env);
    }
}