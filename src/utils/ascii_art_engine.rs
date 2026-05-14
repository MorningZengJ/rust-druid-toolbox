use crate::model::ascii_art_state::{AsciiArtState, Background, CharsetPreset, ColorMode};
use image::{DynamicImage, GenericImageView};

pub struct AsciiArtEngine;

impl AsciiArtEngine {
    /// Convert image to ASCII art based on the current state
    pub fn convert(state: &AsciiArtState) -> Result<AsciiArtOutput, String> {
        let img = state.original_image.as_ref().ok_or("No image loaded")?;

        // Resize image
        let resized = Self::resize_image(img, state.width, state.char_aspect_ratio);

        // Apply brightness and contrast adjustments
        let adjusted = Self::adjust_image(&resized, state.brightness, state.contrast, state.saturation);

        // Get charset
        let charset = Self::get_charset(&state.charset, &state.custom_charset)?;

        // Generate output based on color mode
        match state.color_mode {
            ColorMode::Monochrome => Self::generate_monochrome(&adjusted, &charset, state.invert),
            ColorMode::Ansi256 => Self::generate_ansi256(&adjusted, &charset, state.invert, &state.background),
            ColorMode::TrueColor => Self::generate_truecolor(&adjusted, &charset, state.invert, &state.background),
            ColorMode::Html => Self::generate_html(&adjusted, &charset, state.invert, &state.background),
        }
    }

    /// Resize image considering character aspect ratio
    fn resize_image(img: &DynamicImage, target_width: u32, char_aspect_ratio: f64) -> DynamicImage {
        let (orig_width, orig_height) = img.dimensions();
        let aspect_ratio = orig_height as f64 / orig_width as f64;
        let target_height = (target_width as f64 * aspect_ratio * char_aspect_ratio) as u32;

        img.resize_exact(
            target_width,
            target_height.max(1),
            image::imageops::FilterType::Lanczos3,
        )
    }

    /// Adjust image brightness, contrast, and saturation
    fn adjust_image(img: &DynamicImage, brightness: f64, contrast: f64, saturation: f64) -> DynamicImage {
        let mut rgba = img.to_rgba8();

        for pixel in rgba.pixels_mut() {
            let [r, g, b, a] = pixel.0;

            // Convert to float
            let mut rf = r as f64 / 255.0;
            let mut gf = g as f64 / 255.0;
            let mut bf = b as f64 / 255.0;

            // Apply brightness
            rf = (rf + brightness).clamp(0.0, 1.0);
            gf = (gf + brightness).clamp(0.0, 1.0);
            bf = (bf + brightness).clamp(0.0, 1.0);

            // Apply contrast
            rf = ((rf - 0.5) * contrast + 0.5).clamp(0.0, 1.0);
            gf = ((gf - 0.5) * contrast + 0.5).clamp(0.0, 1.0);
            bf = ((bf - 0.5) * contrast + 0.5).clamp(0.0, 1.0);

            // Apply saturation
            let gray = 0.299 * rf + 0.587 * gf + 0.114 * bf;
            rf = (gray + (rf - gray) * saturation).clamp(0.0, 1.0);
            gf = (gray + (gf - gray) * saturation).clamp(0.0, 1.0);
            bf = (gray + (bf - gray) * saturation).clamp(0.0, 1.0);

            // Convert back to u8
            pixel.0 = [
                (rf * 255.0) as u8,
                (gf * 255.0) as u8,
                (bf * 255.0) as u8,
                a,
            ];
        }

        DynamicImage::ImageRgba8(rgba)
    }

    /// Get charset based on preset or custom input
    fn get_charset(preset: &CharsetPreset, custom: &str) -> Result<Vec<char>, String> {
        match preset {
            CharsetPreset::Custom => {
                if custom.is_empty() {
                    return Err("自定义字符集不能为空".to_string());
                }
                Ok(custom.chars().collect())
            }
            _ => Ok(preset.chars()),
        }
    }

    /// Calculate perceived brightness of a pixel (0.0 to 1.0)
    fn perceived_brightness(r: u8, g: u8, b: u8) -> f64 {
        (0.299 * r as f64 + 0.587 * g as f64 + 0.114 * b as f64) / 255.0
    }

    /// Map brightness to character
    fn brightness_to_char(brightness: f64, charset: &[char], invert: bool) -> char {
        let b = if invert { 1.0 - brightness } else { brightness };
        let index = (b * (charset.len() - 1) as f64).round() as usize;
        charset[index.min(charset.len() - 1)]
    }

    /// Iterate over pixels and apply formatter to each pixel's character and color
    fn iterate_pixels<F>(
        rgba: &image::RgbaImage,
        charset: &[char],
        invert: bool,
        mut formatter: F,
    ) -> (Vec<String>, Vec<String>)
    where
        F: FnMut(u8, u8, u8, char) -> String,
    {
        let (width, height) = rgba.dimensions();
        let mut plain_lines = Vec::new();
        let mut formatted_lines = Vec::new();

        for y in 0..height {
            let mut plain_line = String::new();
            let mut formatted_line = String::new();

            for x in 0..width {
                let pixel = rgba.get_pixel(x, y);
                let brightness = Self::perceived_brightness(pixel[0], pixel[1], pixel[2]);
                let ch = Self::brightness_to_char(brightness, charset, invert);

                plain_line.push(ch);
                formatted_line.push_str(&formatter(pixel[0], pixel[1], pixel[2], ch));
            }

            plain_lines.push(plain_line);
            formatted_lines.push(formatted_line);
        }

        (plain_lines, formatted_lines)
    }

    /// Generate monochrome ASCII art
    fn generate_monochrome(img: &DynamicImage, charset: &[char], invert: bool) -> Result<AsciiArtOutput, String> {
        let rgba = img.to_rgba8();
        let (plain_lines, _) = Self::iterate_pixels(&rgba, charset, invert, |_, _, _, ch| {
            ch.to_string()
        });

        let text = plain_lines.join("\n");
        Ok(AsciiArtOutput {
            plain_text: text.clone(),
            html_text: Self::text_to_html(&text),
            ansi_text: text,
        })
    }

    /// Generate ANSI 256 color ASCII art
    fn generate_ansi256(img: &DynamicImage, charset: &[char], invert: bool, bg: &Background) -> Result<AsciiArtOutput, String> {
        let rgba = img.to_rgba8();
        let (plain_lines, ansi_lines) = Self::iterate_pixels(&rgba, charset, invert, |r, g, b, ch| {
            let ansi_color = Self::rgb_to_ansi256(r, g, b);
            format!("\x1b[38;5;{}m{}\x1b[0m", ansi_color, ch)
        });

        Ok(AsciiArtOutput {
            plain_text: plain_lines.join("\n"),
            html_text: Self::generate_html_from_pixels(&rgba, charset, invert, bg)?,
            ansi_text: ansi_lines.join("\n"),
        })
    }

    /// Generate true color (24-bit) ANSI ASCII art
    fn generate_truecolor(img: &DynamicImage, charset: &[char], invert: bool, bg: &Background) -> Result<AsciiArtOutput, String> {
        let rgba = img.to_rgba8();
        let (plain_lines, ansi_lines) = Self::iterate_pixels(&rgba, charset, invert, |r, g, b, ch| {
            format!("\x1b[38;2;{};{};{}m{}\x1b[0m", r, g, b, ch)
        });

        Ok(AsciiArtOutput {
            plain_text: plain_lines.join("\n"),
            html_text: Self::generate_html_from_pixels(&rgba, charset, invert, bg)?,
            ansi_text: ansi_lines.join("\n"),
        })
    }

    /// Generate HTML colored ASCII art
    fn generate_html(img: &DynamicImage, charset: &[char], invert: bool, bg: &Background) -> Result<AsciiArtOutput, String> {
        let rgba = img.to_rgba8();
        let (plain_lines, html_lines) = Self::iterate_pixels(&rgba, charset, invert, |r, g, b, ch| {
            let escaped = Self::escape_html_char(ch);
            format!("<span style=\"color:#{:02X}{:02X}{:02X}\">{}</span>", r, g, b, escaped)
        });

        let bg_color = match bg {
            Background::Black => "#000000",
            Background::White => "#FFFFFF",
            Background::Transparent => "transparent",
        };

        let html = Self::wrap_html_document(bg_color, &html_lines.join("\n"));

        Ok(AsciiArtOutput {
            plain_text: plain_lines.join("\n"),
            html_text: html,
            ansi_text: plain_lines.join("\n"),
        })
    }

    /// Generate HTML from pixel data (for ANSI modes)
    fn generate_html_from_pixels(
        rgba: &image::RgbaImage,
        charset: &[char],
        invert: bool,
        bg: &Background,
    ) -> Result<String, String> {
        let (width, height) = rgba.dimensions();
        let mut html_lines = Vec::new();

        for y in 0..height {
            let mut html_line = String::new();
            for x in 0..width {
                let pixel = rgba.get_pixel(x, y);
                let brightness = Self::perceived_brightness(pixel[0], pixel[1], pixel[2]);
                let ch = Self::brightness_to_char(brightness, charset, invert);
                let escaped = Self::escape_html_char(ch);
                html_line.push_str(&format!(
                    "<span style=\"color:#{:02X}{:02X}{:02X}\">{}</span>",
                    pixel[0], pixel[1], pixel[2], escaped
                ));
            }
            html_lines.push(html_line);
        }

        let bg_color = match bg {
            Background::Black => "#000000",
            Background::White => "#FFFFFF",
            Background::Transparent => "transparent",
        };

        Ok(Self::wrap_html_document(bg_color, &html_lines.join("\n")))
    }

    /// Convert RGB to ANSI 256 color code
    fn rgb_to_ansi256(r: u8, g: u8, b: u8) -> u8 {
        // Convert to 6x6x6 color cube
        let ri = (r as f64 / 255.0 * 5.0).round() as u8;
        let gi = (g as f64 / 255.0 * 5.0).round() as u8;
        let bi = (b as f64 / 255.0 * 5.0).round() as u8;
        16 + 36 * ri + 6 * gi + bi
    }

    /// Escape HTML special characters
    fn escape_html_char(ch: char) -> String {
        match ch {
            '<' => "&lt;".to_string(),
            '>' => "&gt;".to_string(),
            '&' => "&amp;".to_string(),
            '"' => "&quot;".to_string(),
            ' ' => "&nbsp;".to_string(),
            _ => ch.to_string(),
        }
    }

    /// Wrap content in an HTML document with specified background color
    fn wrap_html_document(bg: &str, body: &str) -> String {
        format!(
            "<!DOCTYPE html>\n<html>\n<head>\n<meta charset=\"utf-8\">\n\
             <style>body{{background:{};font-family:monospace;font-size:8px;line-height:1;}}</style>\n\
             </head>\n<body>\n<pre>\n{}\n</pre>\n</body>\n</html>",
            bg, body
        )
    }

    /// Convert plain text to basic HTML
    fn text_to_html(text: &str) -> String {
        let escaped = text
            .replace('&', "&amp;")
            .replace('<', "&lt;")
            .replace('>', "&gt;")
            .replace(' ', "&nbsp;");
        Self::wrap_html_document("#000;color:#fff", &escaped)
    }
}

#[derive(Debug, Clone)]
pub struct AsciiArtOutput {
    pub plain_text: String,
    pub html_text: String,
    pub ansi_text: String,
}
