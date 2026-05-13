use crate::themes::Theme;

impl Theme {
    pub fn nav_bg(&self) -> iced::Color {
        match self {
            Theme::Light { theme } => theme.palette().background,
            Theme::Dark { theme } => theme.palette().background,
        }
    }

    pub fn main_bg(&self) -> iced::Color {
        match self {
            Theme::Light { theme } => theme.palette().background,
            Theme::Dark { .. } => iced::Color::from_rgb8(0x11, 0x11, 0x11),
        }
    }
}
