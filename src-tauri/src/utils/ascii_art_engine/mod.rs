mod grid;
mod image_preprocess;
mod renderers;

use image::{DynamicImage, GenericImageView};
use std::time::Instant;

use crate::model::ascii_art_state::{
    AsciiArtOutput, AsciiArtParams, AsciiArtProgress, CharsetPreset, ColorMode, RenderMode,
};

pub struct AsciiArtEngine;

impl AsciiArtEngine {
    pub fn convert_from_image<P>(
        params: &AsciiArtParams,
        img: &DynamicImage,
        mut progress_cb: P,
    ) -> Result<AsciiArtOutput, String>
    where
        P: FnMut(AsciiArtProgress),
    {
        let start_time = Instant::now();

        progress_cb(AsciiArtProgress {
            stage: "resize".to_string(),
            progress: 0.0,
            elapsed_ms: 0,
        });
        let resized = Self::resize_image(img, params.width, params.char_aspect_ratio);
        progress_cb(AsciiArtProgress {
            stage: "resize".to_string(),
            progress: 0.05,
            elapsed_ms: start_time.elapsed().as_millis() as u64,
        });

        let adjusted = Self::adjust_image(
            &resized,
            params.brightness,
            params.contrast,
            params.saturation,
            &start_time,
            &mut progress_cb,
        );

        let charset = Self::get_charset(&params.charset, &params.custom_charset);

        let (char_grid, color_grid) = match params.color_mode {
            ColorMode::Monochrome => Self::generate_monochrome_grid(
                &adjusted,
                &charset,
                params.invert,
                &params.background,
                &start_time,
                &mut progress_cb,
            ),
            ColorMode::Ansi256 | ColorMode::TrueColor | ColorMode::Html => {
                Self::generate_color_grid(
                    &adjusted,
                    &charset,
                    params.invert,
                    &start_time,
                    &mut progress_cb,
                )
            }
        };

        let mut output = match params.render_mode {
            RenderMode::Png => Self::generate_png(
                &char_grid,
                &color_grid,
                &params.background,
                &start_time,
                &mut progress_cb,
            ),
            RenderMode::Svg => Self::generate_svg(
                &char_grid,
                &color_grid,
                &params.background,
                &start_time,
                &mut progress_cb,
            ),
            RenderMode::Canvas => {
                Self::generate_canvas_data(&char_grid, &color_grid, &start_time, &mut progress_cb)
            }
        }?;

        output.output_path = None;
        progress_cb(AsciiArtProgress {
            stage: "encode".to_string(),
            progress: 1.0,
            elapsed_ms: start_time.elapsed().as_millis() as u64,
        });

        Ok(output)
    }

    fn resize_image(img: &DynamicImage, target_width: u32, char_aspect_ratio: f64) -> DynamicImage {
        let (orig_w, orig_h) = img.dimensions();
        let ratio = orig_h as f64 / orig_w as f64;
        let target_height = (target_width as f64 * ratio / char_aspect_ratio) as u32;
        img.resize_exact(
            target_width,
            target_height,
            image::imageops::FilterType::Lanczos3,
        )
    }

    fn get_charset(preset: &CharsetPreset, custom: &str) -> String {
        match preset {
            CharsetPreset::Custom => custom.to_string(),
            _ => preset.chars().to_string(),
        }
    }
}
