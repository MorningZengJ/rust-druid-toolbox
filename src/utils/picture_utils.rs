use druid::piet::ImageFormat;
use druid::ImageBuf;
use image::{load, DynamicImage, GenericImageView, ImageReader};
use reqwest::blocking::get;
use std::io::Cursor;

pub struct PictureUtils;

impl PictureUtils {
    pub async fn load_dynamic_image(url: &'static str) -> anyhow::Result<DynamicImage> {
        let response = get(url).await?;
        let bytes = response.bytes().await?;
        let cursor = Cursor::new(bytes);
        let dynamic_image = ImageReader::new(cursor)
            .with_guessed_format()?
            .decode()?;
        Ok(dynamic_image)
    }

    pub async fn convert_to_image_buf(dynamic_image: DynamicImage) -> ImageBuf {
        let (width, height) = dynamic_image.dimensions();
        let rgba_image = dynamic_image.to_rgba8();
        let image_buf = ImageBuf::from_raw(rgba_image, ImageFormat::RgbaSeparate, width as usize, height as usize);
        image_buf
    }

    pub fn load_image_buf(url: &'static str) -> anyhow::Result<ImageBuf> {
        let res = get(url)?;
        let bytes = res.bytes();
        let image = load(Cursor::new(bytes), image::ImageFormat::Jpeg)?;
        let image_rgba = image.to_rgba8();
        let (width, height) = image_rgba.dimensions();
        let buf = ImageBuf::from_raw(
            image_rgba.into_raw(),
            ImageFormat::Grayscale,
            width as usize,
            height as usize,
        );
        Ok(buf)
    }
}