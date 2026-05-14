use image::DynamicImage;
use std::fmt;

#[derive(Debug, Clone)]
pub struct AsciiArtState {
    // Image data
    pub original_image: Option<DynamicImage>,
    pub image_width: u32,
    pub image_height: u32,

    // Parameters
    pub width: u32,
    pub charset: CharsetPreset,
    pub custom_charset: String,
    pub contrast: f64,
    pub brightness: f64,
    pub saturation: f64,
    pub invert: bool,
    pub color_mode: ColorMode,
    pub background: Background,
    pub char_aspect_ratio: f64,

    // Output
    pub ascii_text: String,
    pub colored_html: String,
    pub ansi_text: String,

    // Status
    pub is_converting: bool,
    pub error_message: Option<String>,
}

impl Default for AsciiArtState {
    fn default() -> Self {
        Self {
            original_image: None,
            image_width: 0,
            image_height: 0,
            width: 500,
            charset: CharsetPreset::Standard,
            custom_charset: String::new(),
            contrast: 1.0,
            brightness: 0.0,
            saturation: 1.0,
            invert: false,
            color_mode: ColorMode::Monochrome,
            background: Background::Black,
            char_aspect_ratio: 0.5,
            ascii_text: String::new(),
            colored_html: String::new(),
            ansi_text: String::new(),
            is_converting: false,
            error_message: None,
        }
    }
}

#[derive(Debug, Clone, PartialEq)]
pub enum CharsetPreset {
    Simple,    // .:-=+*#%@
    Standard,  // " .,:;i1tfLCG08@"
    Complex,   // @%#*+=-:.
    Custom,    // User defined
}

impl CharsetPreset {
    pub fn chars(&self) -> Vec<char> {
        match self {
            CharsetPreset::Simple => ".:-=+*#%@".chars().collect(),
            CharsetPreset::Standard => " .,:;i1tfLCG08@".chars().collect(),
            CharsetPreset::Complex => "@%#*+=-:. ".chars().collect(),
            CharsetPreset::Custom => vec![],
        }
    }

    pub fn all() -> Vec<CharsetPreset> {
        vec![
            CharsetPreset::Simple,
            CharsetPreset::Standard,
            CharsetPreset::Complex,
            CharsetPreset::Custom,
        ]
    }
}

impl fmt::Display for CharsetPreset {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            CharsetPreset::Simple => write!(f, "简单"),
            CharsetPreset::Standard => write!(f, "标准"),
            CharsetPreset::Complex => write!(f, "复杂"),
            CharsetPreset::Custom => write!(f, "自定义"),
        }
    }
}

#[derive(Debug, Clone, PartialEq)]
pub enum ColorMode {
    Monochrome,  // Grayscale characters
    Ansi256,     // ANSI 256 colors
    TrueColor,   // 24-bit true color (ANSI)
    Html,        // HTML color spans
}

impl ColorMode {
    pub fn all() -> Vec<ColorMode> {
        vec![
            ColorMode::Monochrome,
            ColorMode::Ansi256,
            ColorMode::TrueColor,
            ColorMode::Html,
        ]
    }
}

impl fmt::Display for ColorMode {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            ColorMode::Monochrome => write!(f, "单色"),
            ColorMode::Ansi256 => write!(f, "ANSI 256色"),
            ColorMode::TrueColor => write!(f, "真彩色"),
            ColorMode::Html => write!(f, "HTML"),
        }
    }
}

#[derive(Debug, Clone, PartialEq)]
pub enum Background {
    Black,
    White,
    Transparent,
}

impl Background {
    pub fn all() -> Vec<Background> {
        vec![
            Background::Black,
            Background::White,
            Background::Transparent,
        ]
    }
}

impl fmt::Display for Background {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Background::Black => write!(f, "黑色"),
            Background::White => write!(f, "白色"),
            Background::Transparent => write!(f, "透明"),
        }
    }
}
