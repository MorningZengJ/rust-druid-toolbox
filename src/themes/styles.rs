use crate::themes::Theme;

impl Theme {
    pub fn secondary_text_style(&self) -> iced::widget::text::Style {
        iced::widget::text::Style {
            color: Some(self.secondary_text_color()),
        }
    }

    pub fn muted_text_style(&self) -> iced::widget::text::Style {
        iced::widget::text::Style {
            color: Some(self.muted_text_color()),
        }
    }

    pub fn main_text_style(&self) -> iced::widget::text::Style {
        iced::widget::text::Style {
            color: Some(self.main_text_color()),
        }
    }

    pub fn warning_text_style(&self) -> iced::widget::text::Style {
        iced::widget::text::Style {
            color: Some(self.warning_color()),
        }
    }

    pub fn error_text_style(&self) -> iced::widget::text::Style {
        iced::widget::text::Style {
            color: Some(self.error_color()),
        }
    }

    pub fn success_text_style(&self) -> iced::widget::text::Style {
        iced::widget::text::Style {
            color: Some(self.success_color()),
        }
    }

    pub fn card_container_style(&self) -> iced::widget::container::Style {
        iced::widget::container::Style {
            background: Some(self.card_bg().into()),
            border: iced::Border {
                radius: 8.0.into(),
                width: 1.0,
                color: self.border_color(),
            },
            ..Default::default()
        }
    }

    pub fn quick_filter_btn_style(&self, active: bool) -> iced::widget::button::Style {
        iced::widget::button::Style {
            background: Some(if active {
                self.accent_color().into()
            } else {
                self.toolbar_bg().into()
            }),
            text_color: if active {
                iced::Color::WHITE
            } else {
                self.main_text_color()
            },
            border: iced::Border {
                radius: 4.0.into(),
                width: 1.0,
                color: self.border_color(),
            },
            ..Default::default()
        }
    }
}
