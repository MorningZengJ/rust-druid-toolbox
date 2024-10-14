use druid::piet::ImageFormat;
use druid::widget::Image;
use druid::ImageBuf;

pub struct PictureUtils;

impl PictureUtils {
    pub fn load_image(bytes: &'static [u8]) -> Image {
        Image::new(ImageBuf::from_raw(bytes, ImageFormat::RgbaSeparate, 24, 24))
    }
}