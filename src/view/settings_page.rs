use druid::widget::Label;
use druid::Widget;

pub fn build_page() -> impl Widget<()> {
    Label::new("Hello settings")
}