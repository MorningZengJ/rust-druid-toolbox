use crate::ui::navigation::{NavigationAction, PageComponent};
use iced::Task;

pub trait StackNavigatorMapper {
    type Message;

    fn component(&self) -> Box<dyn PageComponent<Self::Message>>;
}

pub struct StackNavigator<Message, RoutePage> {
    size: iced::Size,
    active_page: RoutePage,
    active_component: Box<dyn PageComponent<Message>>,
    history: Vec<(RoutePage, Box<dyn PageComponent<Message>>)>,
}

impl<Message, RoutePage> StackNavigator<Message, RoutePage>
where
    RoutePage: StackNavigatorMapper<Message = Message> + Clone + PartialEq,
    Message: Clone + 'static,
{
    pub fn new(init_page: RoutePage, size: iced::Size) -> (Self, Task<Message>) {
        let com = init_page.component();
        let task = com.init();
        (
            Self {
                size,
                active_page: init_page,
                active_component: com,
                history: vec![],
            },
            task,
        )
    }

    pub fn update(&mut self, message: Message) -> Task<Message> {
        self.active_component.update(message)
    }

    #[allow(dead_code)]
    pub fn subscription(&self) -> iced::Subscription<Message> {
        self.active_component.subscription()
    }

    pub fn resize(&mut self, size: iced::Size) {
        self.size = size;
        self.active_component.resize(size)
    }

    pub fn view(&self) -> iced::Element<'_, Message> {
        self.active_component.view()
    }

    pub fn replace(&mut self, new_page: RoutePage) -> Task<Message> {
        if self.active_page != new_page {
            self.active_component = new_page.component();
            self.active_page = new_page;
            self.active_component.resize(self.size);
            return self.active_component.init();
        }
        Task::none()
    }

    pub fn push(&mut self, new_page: RoutePage) -> Task<Message> {
        if self.active_page != new_page {
            let old_component = std::mem::replace(&mut self.active_component, new_page.component());
            let old_page = std::mem::replace(&mut self.active_page, new_page);
            self.history.push((old_page, old_component));
            self.active_component.resize(self.size);
            return self.active_component.init();
        }
        Task::none()
    }

    pub fn pop(&mut self) -> Task<Message> {
        if let Some((page, component)) = self.history.pop() {
            self.active_page = page;
            self.active_component = component;
        }
        Task::none()
    }

    pub fn perform_action(&mut self, action: NavigationAction<RoutePage>) -> Task<Message> {
        match action {
            NavigationAction::Push(page) => self.push(page.clone()),
            NavigationAction::Replace(page) => self.replace(page.clone()),
            NavigationAction::Pop => self.pop(),
            NavigationAction::PopToRoot => {
                if let Some(first) = self.history.drain(..).next() {
                    self.active_page = first.0;
                    self.active_component = first.1;
                }
                Task::none()
            }
        }
    }

    #[allow(dead_code)]
    pub fn allow_pop(&self) -> bool {
        !self.history.is_empty()
    }
}
