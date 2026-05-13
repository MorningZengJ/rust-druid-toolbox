mod app;
mod home;
pub(crate) mod navigation;
mod rename;
mod settings;
mod tabs;
pub(crate) mod components;

use iced::Task;

pub fn run() -> iced::Result {
    app::run()
}

pub trait PageWithNav {
    type Message;

    fn reload(&self) -> Task<Self::Message> {
        Task::none()
    }

    fn update(&mut self, msg: Self::Message) -> Task<Self::Message>;

    fn view(&self) -> iced::Element<'_, Self::Message>;
}
