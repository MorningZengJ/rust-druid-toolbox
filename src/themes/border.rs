use crate::themes::Theme;

impl Theme {
    pub fn nav_main_splitter_border(&self) -> iced::Border {
        iced::border::rounded(iced::border::Radius {
            top_left: 30.0,
            top_right: 0.0,
            bottom_right: 0.0,
            bottom_left: 30.0,
        })
        .width(1)
        .color(iced::Color::from_rgb8(0x33, 0x33, 0x33))
    }
}
