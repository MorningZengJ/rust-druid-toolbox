use crate::ternary_operator;
use iced::theme::{Base, Mode};
use iced::widget::button::Status;
use iced::widget::{button, column, container, row, svg, text, Button};
use iced::{border, color, Alignment, Element, Length};

#[derive(Debug, Clone)]
pub struct MButton<Message> {
    pub variant: ButtonType,
    pub selected: bool,
    pub on_press: Option<Message>,
    pub text_size: f32,
    pub svg_size: f32,
    pub vertical: bool,
}

#[derive(Debug, Default, Clone)]
struct ButtonStyle {
    background: Option<iced::Background>,
    selected_background: Option<iced::Background>,
    disabled_background: Option<iced::Background>,
    hovered_background: Option<iced::Background>,

    text_color: Option<iced::Color>,
    selected_text_color: Option<iced::Color>,
    disabled_text_color: Option<iced::Color>,
    hovered_text_color: Option<iced::Color>,

    border: Option<border::Border>,
    selected_border: Option<border::Border>,
    disabled_border: Option<border::Border>,
    hovered_border: Option<border::Border>,
}

impl ButtonStyle {
    pub fn get(button_type: ButtonType, mode: Mode) -> Self {
        match (button_type, mode) {
            (ButtonType::PrimaryNav, Mode::Dark) => Self::primary_nav_dark(),
            (ButtonType::PrimaryNav, _) => Self::primary_nav_light(),
            (ButtonType::ContentBtn, Mode::Dark) => Self::content_btn_dark(),
            (ButtonType::ContentBtn, _) => Self::content_btn_light(),
        }
    }

    fn primary_nav_light() -> Self {
        Self {
            selected_background: Some(color!(0xF97BB0).into()),
            disabled_background: Some(color!(0x000000, 0.0).into()),
            hovered_background: Some(color!(0xDBB8FF).into()),
            selected_border: Some(border::rounded(3).width(1).color(color!(0xF97BB0))),
            disabled_border: Some(border::rounded(3).width(1).color(color!(0x000000, 0.0))),
            hovered_border: Some(border::rounded(3).width(1).color(color!(0xDBB8FF))),
            ..Default::default()
        }
    }

    fn primary_nav_dark() -> Self {
        Self {
            selected_background: Some(color!(0x828282, 0.6).into()),
            disabled_background: Some(color!(0x000000, 0.0).into()),
            hovered_background: Some(color!(0x828282, 0.4).into()),
            selected_border: Some(border::rounded(30).width(1).color(color!(0x828282, 0.6))),
            hovered_border: Some(border::rounded(30).width(1).color(color!(0x828282, 0.4))),
            ..Default::default()
        }
    }

    fn content_btn_light() -> Self {
        Self {
            disabled_background: Some(color!(0x000000, 0.0).into()),
            hovered_background: Some(color!(0x828282, 0.4).into()),
            hovered_border: Some(border::rounded(30).width(1).color(color!(0x828282, 0.4))),
            ..Default::default()
        }
    }

    fn content_btn_dark() -> Self {
        Self {
            background: Some(iced::Color::from_rgb8(0x22, 0x22, 0x22).into()),
            disabled_background: Some(color!(0x000000, 0.0).into()),
            hovered_background: Some(color!(0x828282, 0.4).into()),
            border: Some(border::rounded(30)),
            hovered_border: Some(border::rounded(30).width(1).color(color!(0x828282, 0.4))),
            ..Default::default()
        }
    }
}

#[derive(Debug, Clone, Copy)]
pub enum ButtonType {
    PrimaryNav,
    ContentBtn,
}

impl<Message> MButton<Message> {
    pub fn new(variant: ButtonType, selected: bool, on_press: Option<Message>) -> Self {
        Self {
            variant,
            selected,
            on_press,
            text_size: 12.0,
            svg_size: 20.0,
            vertical: false,
        }
    }

    pub fn new_vertical(variant: ButtonType, selected: bool, on_press: Option<Message>) -> Self {
        let mut instance = Self::new(variant, selected, on_press);
        instance.vertical = true;
        instance
    }

    pub fn svg_size(mut self, size: f32) -> Self {
        self.svg_size = size;
        self
    }

    pub fn svg_btn<'a>(&self, path: &str) -> Button<'a, Message>
    where
        Message: Clone + 'static,
    {
        let svg_ = svg(svg::Handle::from_path(path))
            .width(Length::Fixed(self.svg_size))
            .height(Length::Fixed(self.svg_size));

        self.btn(svg_).padding(0)
    }

    pub fn svg_text_btn<'a>(
        &self,
        path: &str,
        text_: impl text::IntoFragment<'a>,
    ) -> Button<'a, Message>
    where
        Message: Clone + 'static,
    {
        let svg_ = svg(svg::Handle::from_path(path))
            .width(Length::Fixed(self.svg_size))
            .height(Length::Fixed(self.svg_size));
        let text_content = text(text_).size(self.text_size);

        let btn_content: Element<'a, Message> = if self.vertical {
            column![svg_, text_content]
                .spacing(5)
                .padding(5)
                .align_x(Alignment::Center)
                .into()
        } else {
            row![svg_, text_content]
                .spacing(5)
                .padding(5)
                .align_y(Alignment::Center)
                .into()
        };
        self.btn(btn_content)
    }

    fn btn<'a>(&self, content: impl Into<Element<'a, Message>>) -> Button<'a, Message>
    where
        Message: Clone + 'static,
    {
        let variant = self.variant;
        let selected = self.selected;

        let style_fn = move |theme: &iced::Theme, status: Status| {
            let palette = theme.palette();
            let btn_style = ButtonStyle::get(variant, theme.mode());
            let def_style = button::Style::default();
            button::Style {
                background: ternary_operator!(
                    selected,
                    btn_style.selected_background,
                    match status {
                        Status::Active | Status::Pressed => btn_style.background,
                        Status::Disabled => btn_style.disabled_background,
                        Status::Hovered => btn_style.hovered_background,
                    }
                ),
                text_color: ternary_operator!(
                    selected,
                    btn_style.selected_text_color,
                    match status {
                        Status::Active | Status::Pressed => btn_style.text_color,
                        Status::Disabled => btn_style.disabled_text_color,
                        Status::Hovered => btn_style.hovered_text_color,
                    }
                )
                .unwrap_or(palette.text),
                border: ternary_operator!(
                    selected,
                    btn_style.selected_border,
                    match status {
                        Status::Active | Status::Pressed => btn_style.border,
                        Status::Disabled => btn_style.disabled_border,
                        Status::Hovered => btn_style.hovered_border,
                    }
                )
                .unwrap_or(def_style.border),
                shadow: Default::default(),
                ..Default::default()
            }
        };

        button(
            container(content)
                .width(Length::Fill)
                .align_x(Alignment::Center)
                .align_y(Alignment::Center),
        )
        .on_press_maybe(self.on_press.clone())
        .style(move |theme, status| style_fn(theme, status))
        .padding(5)
    }
}
