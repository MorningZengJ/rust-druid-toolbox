use iced::advanced::layout::{self, Layout};
use iced::advanced::renderer;
use iced::advanced::widget::{self, Tree};
use iced::advanced::Shell;
use iced::mouse;
use iced::{Element, Event, Length, Point, Rectangle, Size, Vector};

/// Virtual scroll state, managed by the parent component.
#[derive(Debug, Clone)]
pub struct VirtualState {
    pub scroll_offset: f32,
}

impl Default for VirtualState {
    fn default() -> Self {
        Self { scroll_offset: 0.0 }
    }
}

impl VirtualState {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn handle_scroll(&mut self, delta_y: f32, total_rows: usize, row_height: f32, viewport_height: f32) {
        let total_height = total_rows as f32 * row_height;
        let max_offset = (total_height - viewport_height).max(0.0);
        self.scroll_offset = (self.scroll_offset - delta_y * row_height).clamp(0.0, max_offset);
    }

    pub fn visible_range(&self, row_height: f32, viewport_height: f32, total_rows: usize) -> (usize, usize) {
        let start = (self.scroll_offset / row_height).floor() as usize;
        let visible_count = (viewport_height / row_height).ceil() as usize + 1;
        let end = (start + visible_count + 1).min(total_rows);
        (start, end)
    }

    pub fn offset_y(&self, row_height: f32) -> f32 {
        let row_start = (self.scroll_offset / row_height).floor();
        -(self.scroll_offset - row_start * row_height)
    }
}

/// A virtual scrolling list widget that only renders visible rows.
pub struct VirtualList<'a, Message, Theme, Renderer> {
    state: &'a VirtualState,
    total_rows: usize,
    row_height: f32,
    rows: Vec<Element<'a, Message, Theme, Renderer>>,
    first_visible: usize,
    on_scroll: Option<Box<dyn Fn(f32) -> Message + 'a>>,
}

impl<'a, Message, Theme, Renderer> VirtualList<'a, Message, Theme, Renderer> {
    pub fn new(
        state: &'a VirtualState,
        total_rows: usize,
        row_height: f32,
        rows: Vec<Element<'a, Message, Theme, Renderer>>,
        first_visible: usize,
    ) -> Self {
        Self {
            state,
            total_rows,
            row_height,
            rows,
            first_visible,
            on_scroll: None,
        }
    }

    pub fn on_scroll(mut self, f: impl Fn(f32) -> Message + 'a) -> Self {
        self.on_scroll = Some(Box::new(f));
        self
    }
}

impl<'a, Message, Theme, Renderer> widget::Widget<Message, Theme, Renderer>
    for VirtualList<'a, Message, Theme, Renderer>
where
    Renderer: renderer::Renderer,
{
    fn size(&self) -> Size<Length> {
        Size {
            width: Length::Fill,
            height: Length::Fill,
        }
    }

    fn layout(
        &mut self,
        tree: &mut Tree,
        renderer: &Renderer,
        limits: &layout::Limits,
    ) -> layout::Node {
        let limits = limits.width(Length::Fill).height(Length::Fill);
        let max = limits.max();

        // Layout each visible row
        let row_limits = layout::Limits::new(
            Size::new(max.width, self.row_height),
            Size::new(max.width, self.row_height),
        );

        let mut children = Vec::new();
        for (i, row) in self.rows.iter_mut().enumerate() {
            let row_tree = &mut tree.children[i];
            let node = row.as_widget_mut().layout(row_tree, renderer, &row_limits);
            let y_offset = (self.first_visible + i) as f32 * self.row_height;
            children.push(node.move_to(Point::new(0.0, y_offset)));
        }

        let total_height = self.total_rows as f32 * self.row_height;
        layout::Node::with_children(Size::new(max.width, total_height.max(max.height)), children)
    }

    fn update(
        &mut self,
        tree: &mut Tree,
        event: &Event,
        layout: Layout<'_>,
        cursor: mouse::Cursor,
        renderer: &Renderer,
        clipboard: &mut dyn iced::advanced::Clipboard,
        shell: &mut Shell<'_, Message>,
        _viewport: &Rectangle,
    ) {
        let bounds = layout.bounds();

        // Handle scroll events
        if let Event::Mouse(mouse::Event::WheelScrolled { delta }) = event {
            if cursor.is_over(bounds) {
                if let Some(on_scroll) = &self.on_scroll {
                    let scroll_y = match delta {
                        mouse::ScrollDelta::Lines { y, .. } => y * 3.0,
                        mouse::ScrollDelta::Pixels { y, .. } => *y,
                    };
                    shell.publish(on_scroll(scroll_y));
                }
            }
        }

        // Forward events to visible rows
        let children: Vec<_> = layout.children().collect();
        for (i, child_layout) in children.into_iter().enumerate() {
            if let Some(row_element) = self.rows.get_mut(i) {
                let row_tree = &mut tree.children[i];
                row_element.as_widget_mut().update(
                    row_tree,
                    event,
                    child_layout,
                    cursor,
                    renderer,
                    clipboard,
                    shell,
                    _viewport,
                );
            }
        }
    }

    fn draw(
        &self,
        tree: &Tree,
        renderer: &mut Renderer,
        theme: &Theme,
        style: &renderer::Style,
        layout: Layout<'_>,
        cursor: mouse::Cursor,
        viewport: &Rectangle,
    ) {
        let children: Vec<_> = layout.children().collect();
        for (i, child_layout) in children.into_iter().enumerate() {
            if let (Some(row_element), Some(row_tree)) =
                (self.rows.get(i), tree.children.get(i))
            {
                let child_bounds = child_layout.bounds();
                // Only draw if visible in viewport
                if child_bounds.y + child_bounds.height > viewport.y
                    && child_bounds.y < viewport.y + viewport.height
                {
                    row_element
                        .as_widget()
                        .draw(row_tree, renderer, theme, style, child_layout, cursor, viewport);
                }
            }
        }
    }

    fn operate(
        &mut self,
        tree: &mut Tree,
        layout: Layout<'_>,
        renderer: &Renderer,
        operation: &mut dyn widget::Operation,
    ) {
        let children: Vec<_> = layout.children().collect();
        for ((row, row_tree), child_layout) in self
            .rows
            .iter_mut()
            .zip(tree.children.iter_mut())
            .zip(children)
        {
            row.as_widget_mut()
                .operate(row_tree, child_layout, renderer, operation);
        }
    }

    fn mouse_interaction(
        &self,
        tree: &Tree,
        layout: Layout<'_>,
        cursor: mouse::Cursor,
        viewport: &Rectangle,
        renderer: &Renderer,
    ) -> mouse::Interaction {
        let children: Vec<_> = layout.children().collect();
        for (i, child_layout) in children.into_iter().enumerate() {
            if let (Some(row_element), Some(row_tree)) =
                (self.rows.get(i), tree.children.get(i))
            {
                let interaction = row_element.as_widget().mouse_interaction(
                    row_tree,
                    child_layout,
                    cursor,
                    viewport,
                    renderer,
                );
                if interaction != mouse::Interaction::default() {
                    return interaction;
                }
            }
        }
        mouse::Interaction::default()
    }

    fn overlay<'b>(
        &'b mut self,
        _tree: &'b mut Tree,
        _layout: Layout<'_>,
        _renderer: &Renderer,
        _viewport: &Rectangle,
        _translation: Vector,
    ) -> Option<iced::advanced::overlay::Element<'b, Message, Theme, Renderer>> {
        // Virtual list rows (container + mouse_area) have no overlays
        None
    }
}

impl<'a, Message, Theme, Renderer> From<VirtualList<'a, Message, Theme, Renderer>>
    for Element<'a, Message, Theme, Renderer>
where
    Message: 'a,
    Theme: 'a,
    Renderer: renderer::Renderer + 'a,
{
    fn from(virtual_list: VirtualList<'a, Message, Theme, Renderer>) -> Self {
        Element::new(virtual_list)
    }
}
