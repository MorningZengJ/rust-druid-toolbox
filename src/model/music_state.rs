use crate::utils::picture_utils::PictureUtils;
use druid::{Data, ImageBuf, Lens};
use im::Vector;

#[derive(Clone, Data, Lens, Default)]
pub struct MusicState {
    pub search: String,
    pub song_list: Vector<SongInfo>,
    pub volume: u32,
    pub loop_single: bool,
    pub loop_list: bool,
    pub random_play: bool,
    pub is_playing: bool,
    pub playing: SongInfo,
}

impl MusicState {
    pub fn new() -> Self {
        Self {
            ..Default::default()
        }
    }
}

#[derive(Clone, Data, Lens, Default)]
pub struct SongInfo {
    pub name: String,
    pub singer: String,
    pub album: String,
    pub cover: String,
    pub duration: f64,
    pub is_playing: bool,
    pub cover_image: Option<ImageBuf>,
}

impl SongInfo {
    pub fn load_cover(&mut self) {
        let result = PictureUtils::load_dynamic_image(&self.cover).await;
        if let Ok(img) = result {
            let buf = PictureUtils::convert_to_image_buf(img).await;
            self.cover_image = Some(buf);
        } else {
            self.cover_image = None;
        }
    }
}
