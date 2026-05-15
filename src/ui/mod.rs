mod app;
pub(crate) mod ascii_art;
mod home;
pub(crate) mod navigation;
pub(crate) mod rename;
mod settings;
mod tabs;
pub(crate) mod components;
pub(crate) mod video_frame;

use iced::Task;

pub fn run() -> iced::Result {
    app::run()
}

pub trait PageWithNav {
    type Message;

    #[allow(dead_code)]
    fn reload(&self) -> Task<Self::Message> {
        Task::none()
    }

    fn update(&mut self, msg: Self::Message) -> Task<Self::Message>;

    fn view(&self) -> iced::Element<'_, Self::Message>;
}
