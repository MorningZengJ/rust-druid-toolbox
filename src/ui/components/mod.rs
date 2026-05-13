mod c_button;

pub use c_button::{ButtonType, MButton};

use iced::widget::{row, text};
use iced::{Alignment, Element, Length};

pub fn comeback_view<'a, Message>(
    title: impl text::IntoFragment<'a>,
    message: Message,
) -> Element<'a, Message>
where
    Message: 'a + Clone + 'static,
{
    row![
        MButton::new(ButtonType::ContentBtn, false, Some(message))
            .svg_size(25.0)
            .svg_btn("assets/svg/arrow_circle_up.svg")
            .width(Length::Fixed(30.0))
            .height(Length::Fixed(30.0)),
        text(title).size(25)
    ]
    .spacing(20)
    .align_y(Alignment::Center)
    .into()
}
