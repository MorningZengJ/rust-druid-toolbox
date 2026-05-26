use image::{RgbaImage, Rgba};
use std::time::Instant;

use super::AsciiArtEngine;
use crate::model::ascii_art_state::{AsciiArtOutput, AsciiArtProgress, Background, CharColor};
use crate::utils::font_renderer::render_char_to_image;

impl AsciiArtEngine {
    fn escape_html_char(ch: char) -> String {
        match ch {
            '&' => "&amp;".to_string(),
            '<' => "&lt;".to_string(),
            '>' => "&gt;".to_string(),
            '"' => "&quot;".to_string(),
            '\'' => "&#39;".to_string(),
            _ => ch.to_string(),
        }
    }

    pub(super) fn generate_png(
        char_grid: &[Vec<char>],
        color_grid: &[Vec<(u8, u8, u8)>],
        bg: &Background,
        start_time: &Instant,
        progress_cb: &mut dyn FnMut(AsciiArtProgress),
    ) -> Result<AsciiArtOutput, String> {
        let height = char_grid.len();
        if height == 0 {
            return Ok(AsciiArtOutput {
                plain_text: String::new(),
                image_data: None,
                svg_data: None,
                char_colors: None,
                output_path: None,
            });
        }
        let width = char_grid[0].len();

        let char_width = 8u32;
        let char_height = 12u32;
        let img_width = width as u32 * char_width;
        let img_height = height as u32 * char_height;

        let bg_color = match bg {
            Background::Black => Rgba([0u8, 0u8, 0u8, 255u8]),
            Background::White => Rgba([255u8, 255u8, 255u8, 255u8]),
            Background::Transparent => Rgba([0u8, 0u8, 0u8, 0u8]),
        };

        let mut img = RgbaImage::from_pixel(img_width, img_height, bg_color);

        for (y, (char_line, color_line)) in char_grid.iter().zip(color_grid.iter()).enumerate() {
            for (x, (&ch, &(r, g, b))) in char_line.iter().zip(color_line.iter()).enumerate() {
                let x0 = x as u32 * char_width;
                let y0 = y as u32 * char_height;
                render_char_to_image(&mut img, ch, x0, y0, char_width, char_height, (r, g, b));
            }

            if height > 0 {
                let progress = 0.50 + (y as f32 / height as f32) * 0.45;
                progress_cb(AsciiArtProgress {
                    stage: "render".to_string(),
                    progress,
                    elapsed_ms: start_time.elapsed().as_millis() as u64,
                });
            }
        }

        progress_cb(AsciiArtProgress {
            stage: "encode".to_string(),
            progress: 0.95,
            elapsed_ms: start_time.elapsed().as_millis() as u64,
        });

        let mut png_bytes: Vec<u8> = Vec::new();
        let encoder = image::codecs::png::PngEncoder::new(&mut png_bytes);
        image::ImageEncoder::write_image(
            encoder,
            img.as_raw(),
            img_width,
            img_height,
            image::ExtendedColorType::Rgba8,
        )
        .map_err(|e| e.to_string())?;

        let plain_text = char_grid
            .iter()
            .map(|line| line.iter().collect::<String>())
            .collect::<Vec<_>>()
            .join("\n");

        Ok(AsciiArtOutput {
            plain_text,
            image_data: Some(png_bytes),
            svg_data: None,
            char_colors: None,
            output_path: None,
        })
    }

    pub(super) fn generate_svg(
        char_grid: &[Vec<char>],
        color_grid: &[Vec<(u8, u8, u8)>],
        bg: &Background,
        start_time: &Instant,
        progress_cb: &mut dyn FnMut(AsciiArtProgress),
    ) -> Result<AsciiArtOutput, String> {
        let height = char_grid.len();
        if height == 0 {
            return Ok(AsciiArtOutput {
                plain_text: String::new(),
                image_data: None,
                svg_data: None,
                char_colors: None,
                output_path: None,
            });
        }
        let width = char_grid[0].len();

        let char_width = 8.0f64;
        let char_height = 12.0f64;
        let svg_width = width as f64 * char_width;
        let svg_height = height as f64 * char_height;

        let bg_color = match bg {
            Background::Black => "#000000",
            Background::White => "#ffffff",
            Background::Transparent => "transparent",
        };

        let mut svg = format!(
            r#"<svg xmlns="http://www.w3.org/2000/svg" width="{}" height="{}" viewBox="0 0 {} {}">"#,
            svg_width, svg_height, svg_width, svg_height
        );
        svg.push_str(&format!(
            r#"<rect width="100%" height="100%" fill="{}"/>"#,
            bg_color
        ));
        svg.push_str(r#"<text font-family="monospace" font-size="10" dy="10">"#);

        for (y, (char_line, color_line)) in char_grid.iter().zip(color_grid.iter()).enumerate() {
            let y_pos = y as f64 * char_height;
            let mut run_start_x: usize = 0;
            let mut run_color: (u8, u8, u8) = (0, 0, 0);
            let mut run_chars = String::new();
            let mut in_run = false;

            for (x, (ch, &(r, g, b))) in char_line.iter().zip(color_line.iter()).enumerate() {
                if !in_run {
                    run_start_x = x;
                    run_color = (r, g, b);
                    run_chars.clear();
                    run_chars.push_str(&Self::escape_html_char(*ch));
                    in_run = true;
                } else if (r, g, b) == run_color {
                    run_chars.push_str(&Self::escape_html_char(*ch));
                } else {
                    let x_pos = run_start_x as f64 * char_width;
                    let color = format!("#{:02x}{:02x}{:02x}", run_color.0, run_color.1, run_color.2);
                    svg.push_str(&format!(
                        r#"<tspan x="{}" y="{}" fill="{}">{}</tspan>"#,
                        x_pos, y_pos, color, run_chars
                    ));
                    run_start_x = x;
                    run_color = (r, g, b);
                    run_chars.clear();
                    run_chars.push_str(&Self::escape_html_char(*ch));
                }
            }
            if in_run {
                let x_pos = run_start_x as f64 * char_width;
                let color = format!("#{:02x}{:02x}{:02x}", run_color.0, run_color.1, run_color.2);
                svg.push_str(&format!(
                    r#"<tspan x="{}" y="{}" fill="{}">{}</tspan>"#,
                    x_pos, y_pos, color, run_chars
                ));
            }

            if height > 0 {
                let progress = 0.50 + (y as f32 / height as f32) * 0.45;
                progress_cb(AsciiArtProgress {
                    stage: "render".to_string(),
                    progress,
                    elapsed_ms: start_time.elapsed().as_millis() as u64,
                });
            }
        }

        svg.push_str("</text></svg>");

        let plain_text = char_grid
            .iter()
            .map(|line| line.iter().collect::<String>())
            .collect::<Vec<_>>()
            .join("\n");

        Ok(AsciiArtOutput {
            plain_text,
            image_data: None,
            svg_data: Some(svg),
            char_colors: None,
            output_path: None,
        })
    }

    pub(super) fn generate_canvas_data(
        char_grid: &[Vec<char>],
        color_grid: &[Vec<(u8, u8, u8)>],
        start_time: &Instant,
        progress_cb: &mut dyn FnMut(AsciiArtProgress),
    ) -> Result<AsciiArtOutput, String> {
        let height = char_grid.len();
        let mut char_colors = Vec::new();

        for (y, (char_line, color_line)) in char_grid.iter().zip(color_grid.iter()).enumerate() {
            for (ch, &(r, g, b)) in char_line.iter().zip(color_line.iter()) {
                char_colors.push(CharColor { char: *ch, r, g, b });
            }

            if height > 0 {
                let progress = 0.50 + (y as f32 / height as f32) * 0.45;
                progress_cb(AsciiArtProgress {
                    stage: "render".to_string(),
                    progress,
                    elapsed_ms: start_time.elapsed().as_millis() as u64,
                });
            }
        }

        let plain_text = char_grid
            .iter()
            .map(|line| line.iter().collect::<String>())
            .collect::<Vec<_>>()
            .join("\n");

        Ok(AsciiArtOutput {
            plain_text,
            image_data: None,
            svg_data: None,
            char_colors: Some(char_colors),
            output_path: None,
        })
    }
}
