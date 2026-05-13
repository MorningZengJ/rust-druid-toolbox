use crate::themes::Theme;

impl Theme {
    pub fn nav_main_splitter_border(&self) -> iced::Border {
        iced::Border {
            radius: iced::border::Radius {
                top_left: 12.0,
                top_right: 0.0,
                bottom_right: 0.0,
                bottom_left: 12.0,
            }
            .into(),
            width: 0.0,
            color: iced::Color::TRANSPARENT,
        }
    }

    pub fn card_border(&self) -> iced::Border {
        iced::Border {
            radius: 8.0.into(),
            width: 1.0,
            color: self.border_color(),
        }
    }

    pub fn input_border(&self) -> iced::Border {
        iced::Border {
            radius: 6.0.into(),
            width: 1.0,
            color: self.border_color(),
        }
    }

    pub fn focused_input_border(&self) -> iced::Border {
        iced::Border {
            radius: 6.0.into(),
            width: 2.0,
            color: self.accent_color(),
        }
    }
}
