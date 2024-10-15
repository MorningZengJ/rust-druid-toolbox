mod model;
mod enums;
mod view;
mod controller;
mod traits;
mod delegate;
mod rules;
mod utils;

use crate::enums::tab_menus::TabMenus;
use crate::model::app_state::{AppState, RenameState};
use crate::model::replace_info::ReplaceInfo;
use druid::widget::{Axis, Flex, Tabs, TabsEdge, TabsTransition};
use druid::{AppLauncher, Size, Widget, WidgetExt, WindowDesc};
use im::vector;
use strum::IntoEnumIterator;

fn main() {
    let flex = Flex::row().with_flex_child(build_tabs(), 1.0);
    let main_window = WindowDesc::new(flex)
        .window_size(Size::new(800.0, 600.0))
        .title("Druid");
    let state = AppState {
        rename_state: RenameState {
            dir_path: String::new(),
            file_list: vector![],
            replace_infos: vector![
                ReplaceInfo::new()
            ],
        }
    };
    AppLauncher::with_window(main_window)
        .launch(state)
        .expect("launch failed");
}

fn build_tabs() -> impl Widget<AppState> {
    let mut tabs = Tabs::new()
        .with_axis(Axis::Vertical)
        .with_edge(TabsEdge::Leading)
        .with_transition(TabsTransition::Slide(100));
    for e in TabMenus::iter() {
        tabs = tabs.with_tab(e.title(), e.build_widget().expand());
    }
    tabs.expand()
}
