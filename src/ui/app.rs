use crate::ui::navigation::{route_page, NavigationAction, StackNavigator};
use crate::ui::{home, settings};
use iced::{window, Element, Size, Task};

const NAV_WIDTH: f32 = 90.0;
const DEFAULT_WIDTH: f32 = 800.0;
const DEFAULT_HEIGHT: f32 = 600.0;
const MIN_WIDTH: f32 = 600.0;
const MIN_HEIGHT: f32 = 400.0;

#[allow(dead_code)]
pub enum Message {
    NavigationAction(NavigationAction<route_page::RoutePage>),
    NavigationContent(route_page::Message),

    WindowResized(Size),
}

struct App {
    nav: StackNavigator<route_page::Message, route_page::RoutePage>,
}

impl App {
    fn boot() -> (Self, Task<Message>) {
        let size = Size::new(DEFAULT_WIDTH, DEFAULT_HEIGHT);
        let (nav, nav_task) = StackNavigator::new(route_page::RoutePage::Home, size);

        let app = Self { nav };
        (app, nav_task.map(Message::NavigationContent))
    }

    fn update(&mut self, message: Message) -> Task<Message> {
        match message {
            Message::NavigationAction(action) => self
                .nav
                .perform_action(action)
                .map(Message::NavigationContent),
            Message::NavigationContent(msg) => self.handle_nav_message(msg),
            Message::WindowResized(size) => {
                let right_width = (size.width - NAV_WIDTH).max(0.0);
                self.nav
                    .resize(Size::new(right_width, size.height));
                Task::none()
            }
        }
    }

    fn view(&self) -> Element<'_, Message> {
        self.nav.view().map(Message::NavigationContent)
    }

    fn subscription(&self) -> iced::Subscription<Message> {
        iced::event::listen_with(|event, _status, _window_id| match event {
            iced::Event::Window(window::Event::Resized(size)) => {
                Some(Message::WindowResized(size))
            }
            _ => None,
        })
    }

    fn handle_nav_message(&mut self, msg: route_page::Message) -> Task<Message> {
        use route_page::Message::*;
        match msg {
            Home(home::Message::Navigate(page))
            | Settings(settings::Message::Navigate(page)) => self
                .nav
                .perform_action(page)
                .map(Message::NavigationContent),

            _ => self.nav.update(msg).map(Message::NavigationContent),
        }
    }
}

pub fn run() -> iced::Result {
    let win_settings = window::Settings {
        size: Size::new(DEFAULT_WIDTH, DEFAULT_HEIGHT),
        min_size: Some(Size::new(MIN_WIDTH, MIN_HEIGHT)),
        ..window::Settings::default()
    };

    iced::application(App::boot, App::update, App::view)
        .subscription(App::subscription)
        .window(win_settings)
        .run()
}
