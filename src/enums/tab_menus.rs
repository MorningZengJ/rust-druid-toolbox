use druid::{Data, Widget};

#[derive(Clone, Data, PartialEq, Debug)]
pub enum TabMenus {
    Rename,
    Settings,
}

impl TabMenus {
    pub fn build_widget(&self) -> Box<dyn Widget<()>> {
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
        match self {
            TabMenus::Rename => "重命名",
            TabMenus::Settings => "设置"
        }
    }
}