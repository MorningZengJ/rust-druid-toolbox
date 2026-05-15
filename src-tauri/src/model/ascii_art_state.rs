use serde::{Deserialize, Serialize};
use std::fmt;

/// Serializable parameters for ASCII art conversion
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AsciiArtParams {
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
}

impl Default for AsciiArtParams {
    fn default() -> Self {
        Self {
            width: 100,
            charset: CharsetPreset::Standard,
            custom_charset: String::new(),
            contrast: 1.0,
            brightness: 0.0,
            saturation: 1.0,
            invert: false,
            color_mode: ColorMode::Html,
            background: Background::Black,
            char_aspect_ratio: 0.5,
        }
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum CharsetPreset {
    Simple,
    Standard,
    Complex,
    Custom,
}

impl CharsetPreset {
    pub fn chars(&self) -> &str {
        match self {
            Self::Simple => " .:-=+*#%@",
            Self::Standard => " .,:;i1tfLCG08@",
            Self::Complex => " .'`^\",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$",
            Self::Custom => "",
        }
    }

    pub fn all() -> Vec<Self> {
        vec![Self::Simple, Self::Standard, Self::Complex, Self::Custom]
    }
}

impl fmt::Display for CharsetPreset {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Simple => write!(f, "简单"),
            Self::Standard => write!(f, "标准"),
            Self::Complex => write!(f, "复杂"),
            Self::Custom => write!(f, "自定义"),
        }
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum ColorMode {
    Monochrome,
    Ansi256,
    TrueColor,
    Html,
}

impl ColorMode {
    pub fn all() -> Vec<Self> {
        vec![Self::Monochrome, Self::Ansi256, Self::TrueColor, Self::Html]
    }
}

impl fmt::Display for ColorMode {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Monochrome => write!(f, "单色"),
            Self::Ansi256 => write!(f, "ANSI 256色"),
            Self::TrueColor => write!(f, "真彩色"),
            Self::Html => write!(f, "HTML"),
        }
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum Background {
    Black,
    White,
    Transparent,
}

impl Background {
    pub fn all() -> Vec<Self> {
        vec![Self::Black, Self::White, Self::Transparent]
    }
}

impl fmt::Display for Background {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Black => write!(f, "黑色"),
            Self::White => write!(f, "白色"),
            Self::Transparent => write!(f, "透明"),
        }
    }
}
