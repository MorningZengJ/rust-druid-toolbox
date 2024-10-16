use crate::enums::material_icon::MaterialIcon;
use crate::model::app_state::AppState;
use druid::widget::Svg;
use druid::{Data, Widget};
use strum_macros::EnumIter;

#[derive(Clone, Data, PartialEq, Debug, EnumIter)]
pub enum TabMenus {
    Rename,
    Settings,
}

impl TabMenus {
    pub fn build_widget(&self) -> Box<dyn Widget<AppState>> {
        match self {
            TabMenus::Rename => Box::new(
                crate::view::rename_page::build_page()
            ),
            TabMenus::Settings => Box::new(
                crate::view::settings_page::build_page()
            ),
        }
    }

    pub fn title(&self) -> &'static str {
        let (title, _icon) = self.fields();
        title
    }

    fn fields(&self) -> (&'static str, Svg) {
        match self {
            TabMenus::Rename => ("重命名", MaterialIcon::BorderColor.load()),
            TabMenus::Settings => ("设 置", MaterialIcon::Settings.load()),
        }
    }
}