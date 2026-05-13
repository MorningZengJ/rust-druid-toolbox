use crate::themes::Theme;

impl Theme {
    pub fn nav_bg(&self) -> iced::Color {
        match self {
            Theme::Light { .. } => iced::Color::from_rgb8(0xF3, 0xF4, 0xF6),
            Theme::Dark { .. } => iced::Color::from_rgb8(0x1E, 0x1E, 0x1E),
        }
    }

    pub fn main_bg(&self) -> iced::Color {
        match self {
            Theme::Light { .. } => iced::Color::from_rgb8(0xFF, 0xFF, 0xFF),
            Theme::Dark { .. } => iced::Color::from_rgb8(0x25, 0x25, 0x26),
        }
    }

    pub fn card_bg(&self) -> iced::Color {
        match self {
            Theme::Light { .. } => iced::Color::from_rgb8(0xF9, 0xFA, 0xFB),
            Theme::Dark { .. } => iced::Color::from_rgb8(0x2D, 0x2D, 0x30),
        }
    }

    pub fn header_bg(&self) -> iced::Color {
        match self {
            Theme::Light { .. } => iced::Color::from_rgb8(0xF3, 0xF4, 0xF6),
            Theme::Dark { .. } => iced::Color::from_rgb8(0x33, 0x33, 0x36),
        }
    }

    pub fn border_color(&self) -> iced::Color {
        match self {
            Theme::Light { .. } => iced::Color::from_rgb8(0xE5, 0xE7, 0xEB),
            Theme::Dark { .. } => iced::Color::from_rgb8(0x3E, 0x3E, 0x42),
        }
    }

    pub fn accent_color(&self) -> iced::Color {
        iced::Color::from_rgb8(0x3B, 0x82, 0xF6)
    }

    pub fn success_color(&self) -> iced::Color {
        iced::Color::from_rgb8(0x10, 0xB9, 0x81)
    }

    pub fn warning_color(&self) -> iced::Color {
        iced::Color::from_rgb8(0xF5, 0x9E, 0x0B)
    }

    pub fn error_color(&self) -> iced::Color {
        iced::Color::from_rgb8(0xEF, 0x44, 0x44)
    }
}
