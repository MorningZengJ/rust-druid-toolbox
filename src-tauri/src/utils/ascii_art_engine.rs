use image::{DynamicImage, GenericImageView, RgbaImage};

use crate::model::ascii_art_state::{AsciiArtParams, Background, CharsetPreset, ColorMode};

pub struct AsciiArtEngine;

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
pub struct AsciiArtOutput {
    pub plain_text: String,
    pub html_text: String,
    pub ansi_text: String,
}

impl AsciiArtEngine {
    /// Convert an image to ASCII art using the given parameters
    pub fn convert_from_image(
        params: &AsciiArtParams,
        img: &DynamicImage,
    ) -> Result<AsciiArtOutput, String> {
        // Resize image
        let resized = Self::resize_image(img, params.width, params.char_aspect_ratio);

        // Adjust brightness/contrast/saturation
        let adjusted = Self::adjust_image(&resized, params.brightness, params.contrast, params.saturation);

        // Get charset
        let charset = Self::get_charset(&params.charset, &params.custom_charset);

        // Generate output based on color mode
        match params.color_mode {
            ColorMode::Monochrome => Self::generate_monochrome(&adjusted, &charset, params.invert, &params.background),
            ColorMode::Ansi256 => Self::generate_ansi256(&adjusted, &charset, params.invert, &params.background),
            ColorMode::TrueColor => Self::generate_truecolor(&adjusted, &charset, params.invert, &params.background),
            ColorMode::Html => Self::generate_html(&adjusted, &charset, params.invert, &params.background),
        }
    }

    fn resize_image(img: &DynamicImage, target_width: u32, char_aspect_ratio: f64) -> DynamicImage {
        let (orig_w, orig_h) = img.dimensions();
        let ratio = orig_h as f64 / orig_w as f64;
        let target_height = (target_width as f64 * ratio * char_aspect_ratio) as u32;
        img.resize_exact(target_width, target_height, image::imageops::FilterType::Lanczos3)
    }

    fn adjust_image(img: &DynamicImage, brightness: f64, contrast: f64, saturation: f64) -> DynamicImage {
        let rgba = img.to_rgba8();
        let (width, height) = rgba.dimensions();
        let mut adjusted = RgbaImage::new(width, height);

        for y in 0..height {
            for x in 0..width {
                let pixel = rgba.get_pixel(x, y);
                let r = pixel[0] as f64;
                let g = pixel[1] as f64;
                let b = pixel[2] as f64;

                // Apply brightness
                let r = (r + brightness * 255.0).clamp(0.0, 255.0);
                let g = (g + brightness * 255.0).clamp(0.0, 255.0);
                let b = (b + brightness * 255.0).clamp(0.0, 255.0);

                // Apply contrast
                let factor = (259.0 * (contrast * 255.0 + 255.0)) / (255.0 * (259.0 - contrast * 255.0));
                let r = (factor * (r - 128.0) + 128.0).clamp(0.0, 255.0);
                let g = (factor * (g - 128.0) + 128.0).clamp(0.0, 255.0);
                let b = (factor * (b - 128.0) + 128.0).clamp(0.0, 255.0);

                // Apply saturation
                let gray = 0.299 * r + 0.587 * g + 0.114 * b;
                let r = (gray + saturation * (r - gray)).clamp(0.0, 255.0);
                let g = (gray + saturation * (g - gray)).clamp(0.0, 255.0);
                let b = (gray + saturation * (b - gray)).clamp(0.0, 255.0);

                adjusted.put_pixel(x, y, image::Rgba([r as u8, g as u8, b as u8, pixel[3]]));
            }
        }

        DynamicImage::ImageRgba8(adjusted)
    }

    fn get_charset(preset: &CharsetPreset, custom: &str) -> String {
        match preset {
            CharsetPreset::Custom => custom.to_string(),
            _ => preset.chars().to_string(),
        }
    }

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

    fn rgb_to_ansi256(r: u8, g: u8, b: u8) -> u8 {
        let ri = (r as f64 / 255.0 * 5.0).round() as u8;
        let gi = (g as f64 / 255.0 * 5.0).round() as u8;
        let bi = (b as f64 / 255.0 * 5.0).round() as u8;
        16 + 36 * ri + 6 * gi + bi
    }

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

    fn wrap_html_document(bg: &Background, body: &str) -> String {
        let bg_color = match bg {
            Background::Black => "#000000",
            Background::White => "#ffffff",
            Background::Transparent => "transparent",
        };
        format!(
            r#"<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="background:{};font-family:monospace;white-space:pre;line-height:1.0;letter-spacing:1px;font-size:12px">
{}
</body>
</html>"#,
            bg_color, body
        )
    }

    fn generate_monochrome(
        img: &DynamicImage,
        charset: &str,
        invert: bool,
        bg: &Background,
    ) -> Result<AsciiArtOutput, String> {
        let rgba = img.to_rgba8();
        let (width, height) = rgba.dimensions();
        let mut plain_lines = Vec::new();
        let mut html_body = String::new();

        for y in 0..height {
            let mut line = String::new();
            for x in 0..width {
                let pixel = rgba.get_pixel(x, y);
                let brightness = Self::perceived_brightness(pixel[0], pixel[1], pixel[2]);
                let ch = Self::brightness_to_char(brightness, charset, invert);
                line.push(ch);
            }
            plain_lines.push(line.clone());
            html_body.push_str(&format!("{}\n", Self::escape_html_chars(&line)));
        }

        let html_text = Self::wrap_html_document(bg, &html_body);
        let ansi_text = plain_lines.join("\n");

        Ok(AsciiArtOutput {
            plain_text: plain_lines.join("\n"),
            html_text,
            ansi_text,
        })
    }

    fn generate_ansi256(
        img: &DynamicImage,
        charset: &str,
        invert: bool,
        bg: &Background,
    ) -> Result<AsciiArtOutput, String> {
        let rgba = img.to_rgba8();
        let (width, height) = rgba.dimensions();
        let mut plain_lines = Vec::new();
        let mut ansi_lines = Vec::new();
        let mut html_body = String::new();

        for y in 0..height {
            let mut plain_line = String::new();
            let mut ansi_line = String::new();
            let mut html_line = String::new();

            for x in 0..width {
                let pixel = rgba.get_pixel(x, y);
                let brightness = Self::perceived_brightness(pixel[0], pixel[1], pixel[2]);
                let ch = Self::brightness_to_char(brightness, charset, invert);
                let color_idx = Self::rgb_to_ansi256(pixel[0], pixel[1], pixel[2]);

                plain_line.push(ch);
                ansi_line.push_str(&format!("\x1b[38;5;{}m{}", color_idx, ch));
                html_line.push_str(&format!(
                    "<span style=\"color:#{:02x}{:02x}{:02x}\">{}</span>",
                    pixel[0], pixel[1], pixel[2], Self::escape_html_char(ch)
                ));
            }

            plain_lines.push(plain_line);
            ansi_lines.push(format!("{}\x1b[0m", ansi_line));
            html_body.push_str(&format!("{}\n", html_line));
        }

        Ok(AsciiArtOutput {
            plain_text: plain_lines.join("\n"),
            html_text: Self::wrap_html_document(bg, &html_body),
            ansi_text: ansi_lines.join("\n"),
        })
    }

    fn generate_truecolor(
        img: &DynamicImage,
        charset: &str,
        invert: bool,
        bg: &Background,
    ) -> Result<AsciiArtOutput, String> {
        let rgba = img.to_rgba8();
        let (width, height) = rgba.dimensions();
        let mut plain_lines = Vec::new();
        let mut ansi_lines = Vec::new();
        let mut html_body = String::new();

        for y in 0..height {
            let mut plain_line = String::new();
            let mut ansi_line = String::new();
            let mut html_line = String::new();

            for x in 0..width {
                let pixel = rgba.get_pixel(x, y);
                let brightness = Self::perceived_brightness(pixel[0], pixel[1], pixel[2]);
                let ch = Self::brightness_to_char(brightness, charset, invert);

                plain_line.push(ch);
                ansi_line.push_str(&format!(
                    "\x1b[38;2;{};{};{}m{}",
                    pixel[0], pixel[1], pixel[2], ch
                ));
                html_line.push_str(&format!(
                    "<span style=\"color:#{:02x}{:02x}{:02x}\">{}</span>",
                    pixel[0], pixel[1], pixel[2], Self::escape_html_char(ch)
                ));
            }

            plain_lines.push(plain_line);
            ansi_lines.push(format!("{}\x1b[0m", ansi_line));
            html_body.push_str(&format!("{}\n", html_line));
        }

        Ok(AsciiArtOutput {
            plain_text: plain_lines.join("\n"),
            html_text: Self::wrap_html_document(bg, &html_body),
            ansi_text: ansi_lines.join("\n"),
        })
    }

    fn generate_html(
        img: &DynamicImage,
        charset: &str,
        invert: bool,
        bg: &Background,
    ) -> Result<AsciiArtOutput, String> {
        let rgba = img.to_rgba8();
        let (width, height) = rgba.dimensions();
        let mut plain_lines = Vec::new();
        let mut html_body = String::new();

        for y in 0..height {
            let mut plain_line = String::new();
            let mut html_line = String::new();

            for x in 0..width {
                let pixel = rgba.get_pixel(x, y);
                let brightness = Self::perceived_brightness(pixel[0], pixel[1], pixel[2]);
                let ch = Self::brightness_to_char(brightness, charset, invert);

                plain_line.push(ch);
                html_line.push_str(&format!(
                    "<span style=\"color:#{:02x}{:02x}{:02x}\">{}</span>",
                    pixel[0], pixel[1], pixel[2], Self::escape_html_char(ch)
                ));
            }

            plain_lines.push(plain_line);
            html_body.push_str(&format!("{}\n", html_line));
        }

        Ok(AsciiArtOutput {
            plain_text: plain_lines.join("\n"),
            html_text: Self::wrap_html_document(bg, &html_body),
            ansi_text: plain_lines.join("\n"),
        })
    }

    fn escape_html_chars(text: &str) -> String {
        text.chars().map(|c| Self::escape_html_char(c)).collect()
    }
}
