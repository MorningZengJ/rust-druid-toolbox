use druid::widget::Label;
use druid::{Data, Widget};

pub fn build_page<T: Data>() -> impl Widget<T> {
    Label::new("Hello settings")
}