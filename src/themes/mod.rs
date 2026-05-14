mod background;
mod border;
mod styles;
mod text;

use iced::theme::{Base, Mode};

#[allow(dead_code)]
pub enum Theme {
    Light { theme: iced::Theme },
    Dark { theme: iced::Theme },
}

pub fn get_theme(theme: &iced::Theme) -> Theme {
    match theme.mode() {
        Mode::Light => Theme::Light {
            theme: theme.clone(),
        },
        _ => Theme::Dark {
            theme: theme.clone(),
        },
    }
}
