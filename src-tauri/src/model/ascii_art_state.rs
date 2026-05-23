use serde::{Deserialize, Serialize};

/// Progress event for ASCII art conversion
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AsciiArtProgress {
    pub stage: String,
    pub progress: f32,
    pub elapsed_ms: u64,
}

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
    pub render_mode: RenderMode,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum RenderMode {
    Png,
    Svg,
    Canvas,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CharColor {
    pub char: char,
    pub r: u8,
    pub g: u8,
    pub b: u8,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AsciiArtOutput {
    pub plain_text: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub image_data: Option<Vec<u8>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub svg_data: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub char_colors: Option<Vec<CharColor>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub output_path: Option<String>,
}

impl Default for AsciiArtParams {
    fn default() -> Self {
        Self {
            width: 800,
            charset: CharsetPreset::Standard,
            custom_charset: String::new(),
            contrast: 1.0,
            brightness: 0.0,
            saturation: 1.0,
            invert: false,
            color_mode: ColorMode::Html,
            background: Background::Black,
            char_aspect_ratio: 0.5,
            render_mode: RenderMode::Png,
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

}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum ColorMode {
    Monochrome,
    Ansi256,
    TrueColor,
    Html,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum Background {
    Black,
    White,
    Transparent,
}

