#![windows_subsystem = "windows"]

mod core;
mod model;
mod themes;
mod ui;
mod utils;

fn main() -> iced::Result {
    ui::run()
}
