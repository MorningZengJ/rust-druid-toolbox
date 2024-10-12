mod model;
mod enums;
mod view;
mod controller;
mod traits;
mod delegate;

use crate::enums::tab_menus::TabMenus;
use druid::widget::{Axis, Flex, Tabs, TabsEdge, TabsTransition};
use druid::{AppLauncher, Size, Widget, WidgetExt, WindowDesc};

fn main() {
    let flex = Flex::row().with_flex_child(build_tabs(), 1.0);
    let main_window = WindowDesc::new(flex)
        .window_size(Size::new(800.0, 600.0))
        .title("Druid");
    AppLauncher::with_window(main_window)
        .launch(())
        .expect("launch failed");
}

fn build_tabs() -> impl Widget<()> {
    Tabs::new()
        .with_axis(Axis::Vertical)
        .with_edge(TabsEdge::Leading)
        .with_transition(TabsTransition::Slide(100))
        .with_tab(
            TabMenus::Rename.title(),
            TabMenus::Rename.build_widget().expand(),
        )
        .with_tab(
            TabMenus::Settings.title(),
            TabMenus::Settings.build_widget().expand(),
        )
        .expand()
}
