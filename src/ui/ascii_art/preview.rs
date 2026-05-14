use iced::advanced::layout::{self, Layout};
use iced::advanced::renderer::{self, Quad};
use iced::advanced::text;
use iced::advanced::widget::{self, Tree};
use iced::advanced::Shell;
use iced::mouse;
use iced::{Border, Color, Element, Event, Length, Point, Rectangle, Shadow, Size, Vector};
use std::cell::Cell;

const FONT_SIZE: f32 = 8.0;
const CHAR_WIDTH_RATIO: f32 = 0.6;
const CHAR_HEIGHT_RATIO: f32 = 1.2;
const MIN_ZOOM_RATIO: f32 = 0.8; // Content should fill at least 80% of viewport

/// A single colored character for the ASCII art preview
#[derive(Debug, Clone)]
pub struct ColoredChar {
    pub ch: char,
    pub color: Color,
}

/// A span of text with the same color for batch rendering
#[derive(Debug, Clone)]
struct ColorSpan {
    text: String,
    color: Color,
    start_col: usize,
}

/// State for the ASCII art preview widget
#[derive(Debug, Clone)]
pub struct PreviewState {
    pub lines: Vec<Vec<ColoredChar>>,
    pub zoom: f32,
    pub pan_offset: Vector,
    pub is_dragging: bool,
    pub drag_start: Option<Point>,
    pub pan_start: Option<Vector>,
    // Pre-processed spans for faster rendering
    spans: Vec<Vec<ColorSpan>>,
    // Content dimensions
    content_rows: usize,
    content_cols: usize,
    // Whether to center on next draw
    needs_center: Cell<bool>,
}

impl Default for PreviewState {
    fn default() -> Self {
        Self {
            lines: Vec::new(),
            zoom: 1.0,
            pan_offset: Vector::ZERO,
            is_dragging: false,
            drag_start: None,
            pan_start: None,
            spans: Vec::new(),
            content_rows: 0,
            content_cols: 0,
            needs_center: Cell::new(false),
        }
    }
}

impl PreviewState {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn set_content(&mut self, lines: Vec<Vec<ColoredChar>>) {
        self.content_rows = lines.len();
        self.content_cols = lines.iter().map(|l| l.len()).max().unwrap_or(0);
        self.spans = Self::build_spans(&lines);
        self.lines = lines;
        self.needs_center.set(true);
    }

    /// Center the content in the given viewport bounds
    pub fn center_in_viewport(&mut self, bounds: &Rectangle) {
        if self.content_rows == 0 || self.content_cols == 0 {
            return;
        }

        let char_width = FONT_SIZE * CHAR_WIDTH_RATIO * self.zoom;
        let char_height = FONT_SIZE * CHAR_HEIGHT_RATIO * self.zoom;

        let content_width = self.content_cols as f32 * char_width;
        let content_height = self.content_rows as f32 * char_height;

        self.pan_offset = Vector::new(
            (bounds.width - content_width) / 2.0,
            (bounds.height - content_height) / 2.0,
        );
    }

    /// Calculate minimum zoom to fit content at 80% of viewport
    fn calculate_min_zoom(&self, bounds: &Rectangle) -> f32 {
        if self.content_rows == 0 || self.content_cols == 0 {
            return 0.2;
        }

        let base_char_width = FONT_SIZE * CHAR_WIDTH_RATIO;
        let base_char_height = FONT_SIZE * CHAR_HEIGHT_RATIO;

        let content_width = self.content_cols as f32 * base_char_width;
        let content_height = self.content_rows as f32 * base_char_height;

        // Calculate zoom that would make content fill 80% of viewport
        let zoom_for_width = (bounds.width * MIN_ZOOM_RATIO) / content_width;
        let zoom_for_height = (bounds.height * MIN_ZOOM_RATIO) / content_height;

        // Use the smaller zoom to ensure content fits in both dimensions
        zoom_for_width.min(zoom_for_height).max(0.1)
    }

    /// Build color spans for batch rendering - merge adjacent chars with same color
    fn build_spans(lines: &[Vec<ColoredChar>]) -> Vec<Vec<ColorSpan>> {
        lines
            .iter()
            .map(|line| {
                if line.is_empty() {
                    return Vec::new();
                }

                let mut spans = Vec::new();
                let mut current_text = String::new();
                let mut current_color = line[0].color;
                let mut start_col = 0;

                for (i, colored_char) in line.iter().enumerate() {
                    if colored_char.color == current_color {
                        current_text.push(colored_char.ch);
                    } else {
                        if !current_text.is_empty() {
                            spans.push(ColorSpan {
                                text: current_text.clone(),
                                color: current_color,
                                start_col,
                            });
                        }
                        current_text.clear();
                        current_text.push(colored_char.ch);
                        current_color = colored_char.color;
                        start_col = i;
                    }
                }

                if !current_text.is_empty() {
                    spans.push(ColorSpan {
                        text: current_text,
                        color: current_color,
                        start_col,
                    });
                }

                spans
            })
            .collect()
    }

    pub fn handle_mouse_scroll(&mut self, delta: mouse::ScrollDelta, bounds: &Rectangle) {
        let scroll_y = match delta {
            mouse::ScrollDelta::Lines { y, .. } => y,
            mouse::ScrollDelta::Pixels { y, .. } => y / 100.0,
        };

        let min_zoom = self.calculate_min_zoom(bounds);
        let old_zoom = self.zoom;
        self.zoom = (self.zoom + scroll_y * 0.1).clamp(min_zoom, 5.0);

        // Zoom towards mouse position if dragging
        if let Some(mouse_pos) = self.drag_start {
            let zoom_ratio = self.zoom / old_zoom;
            let offset_from_mouse = self.pan_offset - Vector::new(mouse_pos.x, mouse_pos.y);
            self.pan_offset = Vector::new(
                mouse_pos.x + offset_from_mouse.x * zoom_ratio,
                mouse_pos.y + offset_from_mouse.y * zoom_ratio,
            );
        } else {
            let zoom_ratio = self.zoom / old_zoom;
            self.pan_offset = self.pan_offset * zoom_ratio;
        }
    }

    pub fn handle_mouse_press(&mut self, position: Point) {
        self.is_dragging = true;
        self.drag_start = Some(position);
        self.pan_start = Some(self.pan_offset);
    }

    pub fn handle_mouse_move(&mut self, position: Point) -> bool {
        if self.is_dragging {
            if let (Some(start), Some(pan_start)) = (self.drag_start, self.pan_start) {
                let delta = position - start;
                let new_offset = pan_start + Vector::new(delta.x, delta.y);
                // Only update if offset actually changed (avoid unnecessary redraws)
                if (new_offset.x - self.pan_offset.x).abs() > 0.5
                    || (new_offset.y - self.pan_offset.y).abs() > 0.5
                {
                    self.pan_offset = new_offset;
                    return true;
                }
            }
        }
        false
    }

    pub fn handle_mouse_release(&mut self) {
        self.is_dragging = false;
        self.drag_start = None;
        self.pan_start = None;
    }

    pub fn reset_view(&mut self, bounds: &Rectangle) {
        let min_zoom = self.calculate_min_zoom(bounds);
        self.zoom = min_zoom;
        self.center_in_viewport(bounds);
    }
}

pub struct AsciiArtPreview<'a, Message, Theme, Renderer> {
    state: &'a PreviewState,
    on_scroll: Option<Box<dyn Fn(mouse::ScrollDelta) -> Message + 'a>>,
    on_press: Option<Box<dyn Fn(Point) -> Message + 'a>>,
    on_drag: Option<Box<dyn Fn(Point) -> Message + 'a>>,
    on_release: Option<Box<dyn Fn() -> Message + 'a>>,
    _phantom: std::marker::PhantomData<(Theme, Renderer)>,
}

impl<'a, Message, Theme, Renderer> AsciiArtPreview<'a, Message, Theme, Renderer> {
    pub fn new(state: &'a PreviewState) -> Self {
        Self {
            state,
            on_scroll: None,
            on_press: None,
            on_drag: None,
            on_release: None,
            _phantom: std::marker::PhantomData,
        }
    }

    pub fn on_scroll(mut self, f: impl Fn(mouse::ScrollDelta) -> Message + 'a) -> Self {
        self.on_scroll = Some(Box::new(f));
        self
    }

    pub fn on_press(mut self, f: impl Fn(Point) -> Message + 'a) -> Self {
        self.on_press = Some(Box::new(f));
        self
    }

    pub fn on_drag(mut self, f: impl Fn(Point) -> Message + 'a) -> Self {
        self.on_drag = Some(Box::new(f));
        self
    }

    pub fn on_release(mut self, f: impl Fn() -> Message + 'a) -> Self {
        self.on_release = Some(Box::new(f));
        self
    }
}

impl<'a, Message, Theme, Renderer> widget::Widget<Message, Theme, Renderer>
    for AsciiArtPreview<'a, Message, Theme, Renderer>
where
    Renderer: renderer::Renderer + text::Renderer<Font = iced::Font>,
{
    fn size(&self) -> Size<Length> {
        Size {
            width: Length::Fill,
            height: Length::Fill,
        }
    }

    fn layout(
        &mut self,
        _tree: &mut Tree,
        _renderer: &Renderer,
        limits: &layout::Limits,
    ) -> layout::Node {
        layout::Node::new(limits.max())
    }

    fn update(
        &mut self,
        _tree: &mut Tree,
        event: &Event,
        layout: Layout<'_>,
        cursor: mouse::Cursor,
        _renderer: &Renderer,
        _clipboard: &mut dyn iced::advanced::Clipboard,
        shell: &mut Shell<'_, Message>,
        _viewport: &Rectangle,
    ) {
        let bounds = layout.bounds();

        // Center content on first draw after content change
        // Using unsafe to mutate through shared reference for centering
        if self.state.needs_center.get() {
            unsafe {
                let state_ptr = self.state as *const PreviewState as *mut PreviewState;
                (*state_ptr).center_in_viewport(&bounds);
                (*state_ptr).needs_center.set(false);
            }
        }

        match event {
            Event::Mouse(mouse_event) => match mouse_event {
                mouse::Event::WheelScrolled { delta } => {
                    if cursor.is_over(bounds) {
                        if let Some(on_scroll) = &self.on_scroll {
                            shell.publish(on_scroll(*delta));
                        }
                    }
                }
                mouse::Event::ButtonPressed(mouse::Button::Left) => {
                    if cursor.is_over(bounds) {
                        if let Some(on_press) = &self.on_press {
                            if let Some(position) = cursor.position() {
                                shell.publish(on_press(position));
                            }
                        }
                    }
                }
                mouse::Event::CursorMoved { position } => {
                    if self.state.is_dragging {
                        if let Some(on_drag) = &self.on_drag {
                            shell.publish(on_drag(*position));
                        }
                    }
                }
                mouse::Event::ButtonReleased(mouse::Button::Left) => {
                    if self.state.is_dragging {
                        if let Some(on_release) = &self.on_release {
                            shell.publish(on_release());
                        }
                    }
                }
                _ => {}
            },
            _ => {}
        }
    }

    fn draw(
        &self,
        _tree: &Tree,
        renderer: &mut Renderer,
        _theme: &Theme,
        _style: &renderer::Style,
        layout: Layout<'_>,
        _cursor: mouse::Cursor,
        _viewport: &Rectangle,
    ) {
        let bounds = layout.bounds();

        // Draw background
        renderer.fill_quad(
            Quad {
                bounds,
                border: Border {
                    radius: 8.0.into(),
                    width: 1.0,
                    color: Color::from_rgb8(0x3E, 0x3E, 0x42),
                },
                shadow: Shadow::default(),
                snap: false,
            },
            Color::from_rgb8(0x1E, 0x1E, 0x1E),
        );

        // Clip to bounds
        renderer.with_layer(bounds, |renderer| {
            let char_width = FONT_SIZE * CHAR_WIDTH_RATIO * self.state.zoom;
            let char_height = FONT_SIZE * CHAR_HEIGHT_RATIO * self.state.zoom;

            let start_x = bounds.x + self.state.pan_offset.x;
            let start_y = bounds.y + self.state.pan_offset.y;

            // Calculate visible range
            let min_row = if start_y < bounds.y {
                ((bounds.y - start_y) / char_height).floor() as usize
            } else {
                0
            };
            let max_row = self.state.spans.len().min(
                ((bounds.y + bounds.height - start_y) / char_height).ceil() as usize + 1,
            );

            // Render using pre-computed spans (batch rendering)
            for row_idx in min_row..max_row {
                let y = start_y + row_idx as f32 * char_height;

                if y + char_height < bounds.y || y > bounds.y + bounds.height {
                    continue;
                }

                let spans = &self.state.spans[row_idx];
                for span in spans {
                    let x = start_x + span.start_col as f32 * char_width;

                    // Quick bounds check for the entire span
                    let span_width = span.text.len() as f32 * char_width;
                    if x + span_width < bounds.x || x > bounds.x + bounds.width {
                        continue;
                    }

                    let text = text::Text {
                        content: span.text.clone(),
                        bounds: Size::new(span_width, char_height),
                        size: iced::Pixels(FONT_SIZE * self.state.zoom),
                        line_height: text::LineHeight::Absolute(iced::Pixels(char_height)),
                        font: iced::Font::MONOSPACE,
                        align_x: iced::alignment::Horizontal::Left.into(),
                        align_y: iced::alignment::Vertical::Top,
                        shaping: text::Shaping::Basic,
                        wrapping: text::Wrapping::None,
                    };

                    renderer.fill_text(text, Point::new(x, y), span.color, bounds);
                }
            }
        });
    }
}

impl<'a, Message, Theme, Renderer> From<AsciiArtPreview<'a, Message, Theme, Renderer>>
    for Element<'a, Message, Theme, Renderer>
where
    Message: 'a,
    Theme: 'a,
    Renderer: renderer::Renderer + text::Renderer<Font = iced::Font> + 'a,
{
    fn from(preview: AsciiArtPreview<'a, Message, Theme, Renderer>) -> Self {
        Element::new(preview)
    }
}
