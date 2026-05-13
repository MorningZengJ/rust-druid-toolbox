use crate::themes::Theme;

impl Theme {
    pub fn main_text_color(&self) -> iced::Color {
        match self {
            Theme::Light { theme } => theme.palette().text,
            Theme::Dark { theme } => theme.palette().text,
        }
    }
}
