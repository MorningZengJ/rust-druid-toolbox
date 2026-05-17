use image::{DynamicImage, GenericImageView, RgbaImage, Rgba};

use crate::model::ascii_art_state::{AsciiArtParams, AsciiArtOutput, Background, CharColor, CharsetPreset, ColorMode, RenderMode};

pub struct AsciiArtEngine;

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

        // Generate character grid based on color mode
        let (char_grid, color_grid) = match params.color_mode {
            ColorMode::Monochrome => Self::generate_monochrome_grid(&adjusted, &charset, params.invert, &params.background),
            ColorMode::Ansi256 | ColorMode::TrueColor | ColorMode::Html => Self::generate_color_grid(&adjusted, &charset, params.invert),
        };

        // Generate output based on render mode
        match params.render_mode {
            RenderMode::Png => Self::generate_png(&char_grid, &color_grid, &params.background),
            RenderMode::Svg => Self::generate_svg(&char_grid, &color_grid, &params.background),
            RenderMode::Canvas => Self::generate_canvas_data(&char_grid, &color_grid),
        }
    }

    fn resize_image(img: &DynamicImage, target_width: u32, char_aspect_ratio: f64) -> DynamicImage {
        let (orig_w, orig_h) = img.dimensions();
        let ratio = orig_h as f64 / orig_w as f64;
        let target_height = (target_width as f64 * ratio * char_aspect_ratio) as u32;
        img.resize_exact(target_width, target_height, image::imageops::FilterType::Lanczos3)
    }

    fn adjust_image(img: &DynamicImage, brightness: f64, contrast: f64, saturation: f64) -> RgbaImage {
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

        adjusted
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

    fn build_char_colors(
        char_grid: &[Vec<char>],
        color_grid: &[Vec<(u8, u8, u8)>],
    ) -> Vec<CharColor> {
        let mut char_colors = Vec::new();
        for (char_line, color_line) in char_grid.iter().zip(color_grid.iter()) {
            for (ch, &(r, g, b)) in char_line.iter().zip(color_line.iter()) {
                char_colors.push(CharColor { char: *ch, r, g, b });
            }
        }
        char_colors
    }

    fn generate_monochrome_grid(
        img: &RgbaImage,
        charset: &str,
        invert: bool,
        bg: &Background,
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
        }

        (char_grid, color_grid)
    }

    fn generate_color_grid(
        img: &RgbaImage,
        charset: &str,
        invert: bool,
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
        }

        (char_grid, color_grid)
    }

    fn generate_png(
        char_grid: &[Vec<char>],
        color_grid: &[Vec<(u8, u8, u8)>],
        bg: &Background,
    ) -> Result<AsciiArtOutput, String> {
        let height = char_grid.len();
        if height == 0 {
            return Ok(AsciiArtOutput {
                plain_text: String::new(),
                image_data: None,
                svg_data: None,
                char_colors: None,
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
            for (x, (_ch, &(r, g, b))) in char_line.iter().zip(color_line.iter()).enumerate() {
                let x0 = x as u32 * char_width;
                let y0 = y as u32 * char_height;

                for dy in 0..char_height {
                    for dx in 0..char_width {
                        let px = x0 + dx;
                        let py = y0 + dy;
                        if px < img_width && py < img_height {
                            img.put_pixel(px, py, Rgba([r, g, b, 255]));
                        }
                    }
                }
            }
        }

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
        })
    }

    fn generate_svg(
        char_grid: &[Vec<char>],
        color_grid: &[Vec<(u8, u8, u8)>],
        bg: &Background,
    ) -> Result<AsciiArtOutput, String> {
        let height = char_grid.len();
        if height == 0 {
            return Ok(AsciiArtOutput {
                plain_text: String::new(),
                image_data: None,
                svg_data: None,
                char_colors: None,
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
        })
    }

    fn generate_canvas_data(
        char_grid: &[Vec<char>],
        color_grid: &[Vec<(u8, u8, u8)>],
    ) -> Result<AsciiArtOutput, String> {
        let char_colors = Self::build_char_colors(char_grid, color_grid);

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
        })
    }
}
