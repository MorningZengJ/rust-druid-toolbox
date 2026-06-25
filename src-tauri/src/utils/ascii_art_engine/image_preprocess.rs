use image::{DynamicImage, RgbaImage};
use std::time::Instant;

use super::AsciiArtEngine;
use crate::model::ascii_art_state::AsciiArtProgress;

impl AsciiArtEngine {
    pub(super) fn adjust_image(
        img: &DynamicImage,
        brightness: f64,
        contrast: f64,
        saturation: f64,
        start_time: &Instant,
        progress_cb: &mut dyn FnMut(AsciiArtProgress),
    ) -> RgbaImage {
        let rgba = img.to_rgba8();
        let (width, height) = rgba.dimensions();
        let mut adjusted = RgbaImage::new(width, height);

        for y in 0..height {
            for x in 0..width {
                let pixel = rgba.get_pixel(x, y);
                let r = pixel[0] as f64;
                let g = pixel[1] as f64;
                let b = pixel[2] as f64;

                let r = (r + brightness * 255.0).clamp(0.0, 255.0);
                let g = (g + brightness * 255.0).clamp(0.0, 255.0);
                let b = (b + brightness * 255.0).clamp(0.0, 255.0);

                let factor =
                    (259.0 * (contrast * 255.0 + 255.0)) / (255.0 * (259.0 - contrast * 255.0));
                let r = (factor * (r - 128.0) + 128.0).clamp(0.0, 255.0);
                let g = (factor * (g - 128.0) + 128.0).clamp(0.0, 255.0);
                let b = (factor * (b - 128.0) + 128.0).clamp(0.0, 255.0);

                let gray = 0.299 * r + 0.587 * g + 0.114 * b;
                let r = (gray + saturation * (r - gray)).clamp(0.0, 255.0);
                let g = (gray + saturation * (g - gray)).clamp(0.0, 255.0);
                let b = (gray + saturation * (b - gray)).clamp(0.0, 255.0);

                adjusted.put_pixel(x, y, image::Rgba([r as u8, g as u8, b as u8, pixel[3]]));
            }

            if height > 0 {
                let progress = 0.05 + (y as f32 / height as f32) * 0.15;
                progress_cb(AsciiArtProgress {
                    stage: "adjust".to_string(),
                    progress,
                    elapsed_ms: start_time.elapsed().as_millis() as u64,
                });
            }
        }

        adjusted
    }
}
