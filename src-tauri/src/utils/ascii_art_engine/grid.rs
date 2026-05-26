use image::RgbaImage;
use std::time::Instant;

use super::AsciiArtEngine;
use crate::model::ascii_art_state::{AsciiArtProgress, Background};

impl AsciiArtEngine {
    fn perceived_brightness(r: u8, g: u8, b: u8) -> f64 {
        0.299 * r as f64 + 0.587 * g as f64 + 0.114 * b as f64
    }

    fn brightness_to_char(brightness: f64, charset: &str, invert: bool) -> char {
        let chars: Vec<char> = charset.chars().collect();
        if chars.is_empty() {
            return ' ';
        }
        let idx = if invert {
            ((1.0 - brightness / 255.0) * (chars.len() - 1) as f64) as usize
        } else {
            ((brightness / 255.0) * (chars.len() - 1) as f64) as usize
        };
        chars[idx.min(chars.len() - 1)]
    }

    pub(super) fn generate_monochrome_grid(
        img: &RgbaImage,
        charset: &str,
        invert: bool,
        bg: &Background,
        start_time: &Instant,
        progress_cb: &mut dyn FnMut(AsciiArtProgress),
    ) -> (Vec<Vec<char>>, Vec<Vec<(u8, u8, u8)>>) {
        let mono_color = match bg {
            Background::White => (0u8, 0u8, 0u8),
            _ => (255u8, 255u8, 255u8),
        };

        let (width, height) = img.dimensions();
        let mut char_grid = Vec::new();
        let mut color_grid = Vec::new();

        for y in 0..height {
            let mut char_line = Vec::new();
            let mut color_line = Vec::new();
            for x in 0..width {
                let pixel = img.get_pixel(x, y);
                let brightness = Self::perceived_brightness(pixel[0], pixel[1], pixel[2]);
                let ch = Self::brightness_to_char(brightness, charset, invert);
                char_line.push(ch);
                color_line.push(mono_color);
            }
            char_grid.push(char_line);
            color_grid.push(color_line);

            if height > 0 {
                let progress = 0.20 + (y as f32 / height as f32) * 0.30;
                progress_cb(AsciiArtProgress {
                    stage: "grid".to_string(),
                    progress,
                    elapsed_ms: start_time.elapsed().as_millis() as u64,
                });
            }
        }

        (char_grid, color_grid)
    }

    pub(super) fn generate_color_grid(
        img: &RgbaImage,
        charset: &str,
        invert: bool,
        start_time: &Instant,
        progress_cb: &mut dyn FnMut(AsciiArtProgress),
    ) -> (Vec<Vec<char>>, Vec<Vec<(u8, u8, u8)>>) {
        let (width, height) = img.dimensions();
        let mut char_grid = Vec::new();
        let mut color_grid = Vec::new();

        for y in 0..height {
            let mut char_line = Vec::new();
            let mut color_line = Vec::new();
            for x in 0..width {
                let pixel = img.get_pixel(x, y);
                let brightness = Self::perceived_brightness(pixel[0], pixel[1], pixel[2]);
                let ch = Self::brightness_to_char(brightness, charset, invert);
                char_line.push(ch);
                color_line.push((pixel[0], pixel[1], pixel[2]));
            }
            char_grid.push(char_line);
            color_grid.push(color_line);

            if height > 0 {
                let progress = 0.20 + (y as f32 / height as f32) * 0.30;
                progress_cb(AsciiArtProgress {
                    stage: "grid".to_string(),
                    progress,
                    elapsed_ms: start_time.elapsed().as_millis() as u64,
                });
            }
        }

        (char_grid, color_grid)
    }
}
