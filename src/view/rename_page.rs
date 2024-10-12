use crate::additional_directory;
use crate::traits::directory_choose::DirectoryChoose;
use druid::commands::SHOW_OPEN_PANEL;
use druid::widget::{Controller, Flex, Label, TextBox};
use druid::{Data, Env, Event, EventCtx, FileDialogOptions, Lens, Widget, WidgetExt};

#[derive(Clone, Data, Lens, Default)]
struct RenameState {
    dir_path: String,

}
additional_directory!(RenameState);

struct ToRenameState;

impl Lens<(), RenameState> for ToRenameState {
    fn with<V, F: FnOnce(&RenameState) -> V>(&self, _: &(), f: F) -> V {
        f(&RenameState::default())
    }

    fn with_mut<V, F: FnOnce(&mut RenameState) -> V>(&self, _: &mut (), f: F) -> V {
        let mut s = RenameState::default();
        f(&mut s)
    }
}

pub fn build_page() -> impl Widget<()> {
    Flex::column()
        .with_child(build_dir_path())
        .lens(ToRenameState)
}

fn build_dir_path() -> impl Widget<RenameState> {
    let dir_path_label = Label::new("文件路径：")
        .fix_width(100.0)
        .padding(5.0);
    let dir_path_input = TextBox::new()
        .with_placeholder("文件路径")
        .lens(RenameState::dir_path)
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

// controller
struct SelectPathController;

impl<B: DirectoryChoose, W: Widget<B>> Controller<B, W> for SelectPathController {
    fn event(&mut self, child: &mut W, ctx: &mut EventCtx, event: &Event, data: &mut B, env: &Env) {
        match event {
            Event::MouseDown(mouse) => {
                if mouse.button.is_left() && mouse.count == 2 {
                    let options = FileDialogOptions::new()
                        .select_directories()
                        .title("选择文件夹");
                    let sink = ctx.get_external_handle();
                    ctx.submit_command(
                        SHOW_OPEN_PANEL.with(options.clone())
                    );
                }
            }
            _ => {}
        }
        child.event(ctx, event, data, env);
    }
}
