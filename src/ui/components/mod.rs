mod c_button;
mod truncated_text;

pub use c_button::{ButtonType, MButton};
pub use truncated_text::{truncated_text_muted_with_tooltip, truncated_text_with_tooltip};

use iced::widget::{row, text};
use iced::{Alignment, Element, Length};

#[allow(dead_code)]
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
