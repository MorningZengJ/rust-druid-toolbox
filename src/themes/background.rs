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

    pub fn table_header_bg(&self) -> iced::Color {
        match self {
            Theme::Light { .. } => iced::Color::from_rgb8(0xF3, 0xF4, 0xF6),
            Theme::Dark { .. } => iced::Color::from_rgb8(0x2A, 0x2A, 0x2E),
        }
    }

    pub fn selected_row_bg(&self) -> iced::Color {
        match self {
            Theme::Light { .. } => iced::Color::from_rgb8(0xDB, 0xEA, 0xFE),
            Theme::Dark { .. } => iced::Color::from_rgb8(0x00, 0x6B, 0xB0),
        }
    }

    pub fn status_success_bg(&self) -> iced::Color {
        match self {
            Theme::Light { .. } => iced::Color::from_rgb8(0xD1, 0xFA, 0xE5),
            Theme::Dark { .. } => iced::Color::from_rgb8(0x06, 0x4E, 0x3B),
        }
    }

    pub fn status_error_bg(&self) -> iced::Color {
        match self {
            Theme::Light { .. } => iced::Color::from_rgb8(0xFE, 0xE2, 0xE2),
            Theme::Dark { .. } => iced::Color::from_rgb8(0x7F, 0x1D, 0x1D),
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

    pub fn diff_added_bg(&self) -> iced::Color {
        match self {
            Theme::Light { .. } => iced::Color::from_rgb8(0xD1, 0xFA, 0xE5),
            Theme::Dark { .. } => iced::Color::from_rgb8(0x0A, 0x3D, 0x2A),
        }
    }

    pub fn diff_removed_bg(&self) -> iced::Color {
        match self {
            Theme::Light { .. } => iced::Color::from_rgb8(0xFE, 0xE2, 0xE2),
            Theme::Dark { .. } => iced::Color::from_rgb8(0x4C, 0x1D, 0x1D),
        }
    }

    pub fn conflict_bg(&self) -> iced::Color {
        match self {
            Theme::Light { .. } => iced::Color::from_rgb8(0xFE, 0xF3, 0xC7),
            Theme::Dark { .. } => iced::Color::from_rgb8(0x45, 0x1A, 0x03),
        }
    }

    pub fn toolbar_bg(&self) -> iced::Color {
        match self {
            Theme::Light { .. } => iced::Color::from_rgb8(0xF9, 0xFA, 0xFB),
            Theme::Dark { .. } => iced::Color::from_rgb8(0x2D, 0x2D, 0x30),
        }
    }

    pub fn bottom_bar_bg(&self) -> iced::Color {
        match self {
            Theme::Light { .. } => iced::Color::from_rgb8(0xF3, 0xF4, 0xF6),
            Theme::Dark { .. } => iced::Color::from_rgb8(0x1E, 0x1E, 0x1E),
        }
    }

    pub fn panel_bg(&self) -> iced::Color {
        match self {
            Theme::Light { .. } => iced::Color::from_rgb8(0xFF, 0xFF, 0xFF),
            Theme::Dark { .. } => iced::Color::from_rgb8(0x25, 0x25, 0x26),
        }
    }

    pub fn splitter_bg(&self) -> iced::Color {
        match self {
            Theme::Light { .. } => iced::Color::from_rgb8(0xE5, 0xE7, 0xEB),
            Theme::Dark { .. } => iced::Color::from_rgb8(0x3E, 0x3E, 0x42),
        }
    }

    pub fn splitter_hover_bg(&self) -> iced::Color {
        iced::Color::from_rgb8(0x00, 0x7A, 0xCC)
    }
}
