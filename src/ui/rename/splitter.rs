use crate::themes::get_theme;
use crate::ui::rename::spacing;
use iced::widget::{container, Space};
use iced::{Element, Length, Point};

#[derive(Debug, Clone)]
pub struct SplitterState {
    pub is_dragging: bool,
    pub drag_start_x: f32,
    pub panel_width_at_drag: f32,
    pub is_hovered: bool,
    pub last_mouse_x: f32,
}

impl Default for SplitterState {
    fn default() -> Self {
        Self {
            is_dragging: false,
            drag_start_x: 0.0,
            panel_width_at_drag: 0.0,
            is_hovered: false,
            last_mouse_x: 0.0,
        }
    }
}

impl SplitterState {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn start_drag(&mut self, current_width: f32) {
        self.is_dragging = true;
        self.drag_start_x = self.last_mouse_x;
        self.panel_width_at_drag = current_width;
    }

    pub fn handle_drag(&mut self, mouse_x: f32) -> f32 {
        self.last_mouse_x = mouse_x;
        if self.is_dragging {
            let delta = mouse_x - self.drag_start_x;
            (self.panel_width_at_drag + delta)
                .clamp(spacing::LEFT_PANEL_MIN, spacing::LEFT_PANEL_MAX)
        } else {
            self.panel_width_at_drag
        }
    }

    pub fn end_drag(&mut self) {
        self.is_dragging = false;
    }
}

pub fn view<Message>(
    splitter_state: &SplitterState,
    on_press: Message,
    on_move: impl Fn(f32) -> Message + 'static,
    on_release: Message,
    on_hover: impl Fn(bool) -> Message + 'static,
) -> Element<'_, Message>
where
    Message: Clone + 'static,
{
    let is_active = splitter_state.is_dragging || splitter_state.is_hovered;

    let bar = container(Space::new())
        .width(Length::Fixed(spacing::SPLITTER_W))
        .height(Length::Fill)
        .style(move |theme| {
            let c_theme = get_theme(theme);
            container::Style {
                background: Some(
                    if is_active {
                        c_theme.splitter_hover_bg()
                    } else {
                        c_theme.splitter_bg()
                    }
                    .into(),
                ),
                ..Default::default()
            }
        });

    iced::widget::mouse_area(bar)
        .on_press(on_press)
        .on_move(move |point: Point| on_move(point.x))
        .on_release(on_release)
        .on_enter(on_hover(true))
        .on_exit(on_hover(false))
        .into()
}
