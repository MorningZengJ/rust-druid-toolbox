use crate::themes::Theme;

impl Theme {
    pub fn main_text_color(&self) -> iced::Color {
        match self {
            Theme::Light { .. } => iced::Color::from_rgb8(0x1F, 0x29, 0x37),
            Theme::Dark { .. } => iced::Color::from_rgb8(0xE5, 0xE7, 0xEB),
        }
    }

    pub fn secondary_text_color(&self) -> iced::Color {
        match self {
            Theme::Light { .. } => iced::Color::from_rgb8(0x6B, 0x72, 0x80),
            Theme::Dark { .. } => iced::Color::from_rgb8(0x9C, 0xA3, 0xAF),
        }
    }

    pub fn muted_text_color(&self) -> iced::Color {
        match self {
            Theme::Light { .. } => iced::Color::from_rgb8(0x9C, 0xA3, 0xAF),
            Theme::Dark { .. } => iced::Color::from_rgb8(0x6B, 0x72, 0x80),
        }
    }
}
