use crate::model::app_state::AppState;
use crate::model::music_state::{MusicState, SongInfo};
use druid::widget::{Flex, Image, List, Scroll, TextBox};
use druid::{ImageBuf, LensExt, Widget, WidgetExt};

pub fn build_page() -> impl Widget<AppState> {
    Flex::column()
        .with_child(build_search_bar())
        .with_flex_child(build_playlist(), 1.0)
}

fn build_search_bar() -> impl Widget<AppState> {
    let search_box = TextBox::new()
        .with_placeholder("想听点什么？")
        .lens(AppState::music_state.then(MusicState::search));

    Flex::row()
        .with_child(search_box)
}

fn build_playlist() -> impl Widget<AppState> {
    Scroll::new(
        List::new(|| {})
    )
}

fn build_play_bar() -> impl Widget<AppState> {
    let cover = Image::new(ImageBuf::empty())
        .lens(AppState::music_state.then(MusicState::playing).then(SongInfo::cover_image));
    Flex::row()
        .with_child(cover)
}