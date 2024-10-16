use crate::controller::controllers::Controllers;
use crate::controller::directory_choose_controller::DirectoryChooseController;
use crate::controller::mouse_controller_factory::MouseController;
use crate::enums::material_icon::MaterialIcon;
use crate::model::app_state::{AppState, RenameState};
use crate::model::file_info::FileInfo;
use crate::model::replace_info::ReplaceInfo;
use crate::utils::common_utils::CommonUtils;
use crate::utils::date_utils::DateUtils;
use druid::lens::Map;
use druid::text::EditableText;
use druid::widget::{Checkbox, Container, Controller, Flex, Label, LineBreaking, List, Painter, Scroll, Split, TextBox};
use druid::{Color, Data, Env, Event, EventCtx, LensExt, RenderContext, Selector, UpdateCtx, Widget, WidgetExt};
use im::Vector;
use regex::Regex;

pub fn build_page() -> impl Widget<AppState> {
    Flex::column()
        .with_child(build_dir_path())
        .with_child(build_filter())
        .with_flex_child(build_split_files(), 0.5)
        .with_flex_child(build_replace_info_list(), 0.5)
        .with_child(build_buttons())
}

fn build_dir_path() -> impl Widget<AppState> {
    let dir_path_label = Label::new("文件路径：")
        .fix_width(100.0);
    let dir_path_input = TextBox::new()
        .with_placeholder("文件路径")
        .lens(AppState::rename_state.then(RenameState::dir_path))
        .expand_width()
        // .fix_width(500.0)
        .border(Color::BLUE, 1.0)
        .controller(DirectoryChooseController::choose());
    let arrow_btn = Container::new(MaterialIcon::ArrowCircleUp.load()
        .border(Color::WHITE, 0.3)
        .rounded(3.0)
        .controller(MouseController::mouse_cursor_pointer())
        .on_click(|_ctx, data: &mut AppState, _env| {
            data.rename_state.dir_path = CommonUtils::parent_path(&data.rename_state.dir_path);
        }))
        .padding(13.0)
        .fix_width(50.0);

    Flex::row()
        .with_spacer(10.0)
        .with_child(dir_path_label)
        .with_spacer(10.0)
        .with_flex_child(dir_path_input, 1.0)
        .with_spacer(10.0)
        .with_child(arrow_btn)
        .with_spacer(10.0)
        .must_fill_main_axis(true)
}

fn build_filter() -> impl Widget<AppState> {
    const FILTER_CHANGE: Selector<String> = Selector::new("toolbox-builtin. filter-change");
    let controller = Controllers {
        command: Some(|ctx: &mut EventCtx, data: &mut AppState, _env: &Env, event: &Event| {
            if let Event::Command(cmd) = event {
                if let Some(_) = cmd.get(FILTER_CHANGE) {
                    data.rename_state.get_filter_file_list();
                }
            }
        }),
        update: Some(|ctx: &mut UpdateCtx, old: &AppState, data: &AppState| {
            if old.rename_state.filter.same(&data.rename_state.filter) {
                return;
            }
            ctx.submit_command(FILTER_CHANGE.with(String::new()));
        }),
        ..Default::default()
    };
    let filter_label = Label::new("过 滤：")
        .fix_width(100.0);
    let filter_input = TextBox::new()
        .with_placeholder("关键字或正则表达式")
        .lens(AppState::rename_state.then(RenameState::filter)
            .map(
                |data| data.0.clone(),
                |data, content| {
                    data.0 = content.clone();
                },
            )
        )
        .controller(controller.clone())
        .expand_width();
    let regex_checkbox = Checkbox::new("正则")
        .fix_width(50.0)
        .lens(AppState::rename_state.then(RenameState::filter)
            .map(
                |data| data.1,
                |data, is_regex| {
                    data.1 = is_regex;
                },
            )
        )
        .controller(controller);

    Flex::row()
        .with_spacer(10.0)
        .with_child(filter_label)
        .with_spacer(10.0)
        .with_flex_child(filter_input, 1.0)
        .with_spacer(10.0)
        .with_child(regex_checkbox)
        .with_spacer(10.0)
}

fn build_split_files() -> impl Widget<AppState> {
    Split::columns(build_left_file_list(), build_right_file_list())
        .draggable(true)
        .split_point(0.75)
}

fn build_left_file_list() -> impl Widget<AppState> {
    let header = Flex::row()
        .with_flex_child(
            Label::new("名称").expand_width(), 0.5,
        )
        .with_flex_child(
            Label::new("类型").expand_width(), 0.15,
        )
        .with_flex_child(
            Label::new("修改时间").expand_width(), 0.2,
        )
        .with_flex_child(
            Label::new("大小").expand_width(), 0.15,
        )
        .expand_width();

    let scroll_list = Scroll::new(List::new(|| {
        let name_label = Label::new(|item: &FileInfo, _env: &Env| format!("{}", item.name))
            .with_line_break_mode(LineBreaking::WordWrap)
            .expand_width();
        let type_label = Label::new(|item: &FileInfo, _env: &Env| format!("{}", item.extension))
            .with_line_break_mode(LineBreaking::WordWrap)
            .expand_width();
        let modified_time_label = Label::new(|item: &FileInfo, _env: &Env| format!("{}", DateUtils::format_by_pattern(item.modified_time, "%Y-%m-%d %H:%M")))
            .with_line_break_mode(LineBreaking::WordWrap)
            .expand_width();
        let size_label = Label::new(|item: &FileInfo, _env: &Env| format!("{}", item.size))
            .with_line_break_mode(LineBreaking::WordWrap)
            .expand_width();
        Flex::row()
            .with_flex_child(name_label, 0.5)
            .with_flex_child(type_label, 0.15)
            .with_flex_child(modified_time_label, 0.2)
            .with_flex_child(size_label, 0.15)
    }))
        .vertical()
        .lens(AppState::rename_state.then(RenameState::filter_file_list))
        .expand();

    Flex::column()
        .with_child(header)
        .with_flex_child(scroll_list, 1.0)
}

fn build_right_file_list() -> impl Widget<AppState> {
    let header = Flex::row()
        .with_flex_child(
            Label::new("名称").expand_width(), 1.0,
        )
        .expand_width();
    let scroll_list = Scroll::new(List::new(|| {
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
                rename_state.filter_file_list.iter().cloned()
                    .map(|file_info| (file_info, rename_state.replace_infos.clone()))
                    .collect::<Vector<_>>()
            },
            |_: &mut RenameState, _: Vector<(FileInfo, Vector<ReplaceInfo>)>| {},
        )))
        .expand();
    Flex::column()
        .with_child(header)
        .with_flex_child(scroll_list, 1.0)
}

fn build_replace_info_list() -> impl Widget<AppState> {
    const REMOVE_ITEM: Selector<ReplaceInfo> = Selector::new("toolbox-builtin. remove-item");
    Scroll::new(List::new(move || {
        let painter = Painter::new(|ctx, data: &ReplaceInfo, _env| {
            let rect = ctx.size().to_rect();
            let color = if data.is_error { Color::RED } else { Color::YELLOW };
            ctx.stroke(rect, &color, 2.0);
        });

        let remove_btn = MaterialIcon::RemoveCircleOutline.load()
            .padding(10.0)
            .controller(MouseController::mouse_cursor_pointer())
            .on_click(|_ctx, data: &mut ReplaceInfo, _env| {
                _ctx.submit_notification(REMOVE_ITEM.with(data.clone()));
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
            .with_child(remove_btn)
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
        .controller(
            Controllers::<AppState, _, fn(&mut UpdateCtx, &AppState, &AppState)> {
                notification: Some(|ctx: &mut EventCtx, data: &mut AppState, _env: &Env, event: &Event| {
                    if let Event::Notification(notify) = event {
                        if let Some(item) = notify.get(REMOVE_ITEM) {
                            data.rename_state.replace_infos.retain(|info| !info.same(item));
                        }
                    }
                }),
                ..Default::default()
            }
        )
}

fn build_buttons() -> impl Widget<AppState> {
    // 创建第一个按钮
    let add_new_row_btn = MaterialIcon::PlaylistAdd.load()
        .border(Color::WHITE, 0.3)
        .rounded(3.0)
        .controller(MouseController::mouse_cursor_pointer())
        .on_click(|_ctx, data: &mut AppState, _env| {
            let mut allow = true;
            if let Some(last) = data.rename_state.replace_infos.last() {
                if last.content.is_empty() && last.target.is_empty() {
                    allow = false;
                }
            }
            if allow {
                data.rename_state.replace_infos.push_back(ReplaceInfo::new());
            }
        });

    // 创建第二个按钮
    let sure_replace_btn = MaterialIcon::BorderColor.load()
        .border(Color::WHITE, 0.3)
        .rounded(3.0)
        .controller(MouseController::mouse_cursor_pointer())
        .on_click(|_ctx, data: &mut AppState, _env| {
            for info in &mut data.rename_state.filter_file_list.iter_mut() {
                let replace_infos = &data.rename_state.replace_infos;
                for ri in replace_infos {
                    if ri.enable {
                        info.name = if ri.is_regex {
                            match Regex::new(&*ri.content) {
                                Ok(regex) => regex.replace_all(&info.name, ri.target.clone()).to_string(),
                                Err(_) => info.name.clone()
                            }
                        } else {
                            info.name.replace(&*ri.content, &*ri.target)
                        };
                        println!("path: {:?}, parent_path: {}", info.path, info.parent_path);
                        // std::fs::rename(oldname,newname)
                    }
                }
            }
        });

    // 将按钮添加到水平布局中
    Flex::row()
        .with_child(add_new_row_btn)
        .with_spacer(20.0)
        .with_child(sure_replace_btn)
        .padding(10.0)
}

struct RegexController;

impl RegexController {
    const REGEX_CHANGE: Selector<bool> = Selector::new("toolbox-builtin. regex-change");
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