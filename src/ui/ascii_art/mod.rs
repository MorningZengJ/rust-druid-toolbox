mod preview;

use crate::model::ascii_art_state::{AsciiArtState, Background, CharsetPreset, ColorMode};
use crate::ui::PageWithNav;
use crate::utils::ascii_art_engine::{AsciiArtEngine, AsciiArtOutput};
use iced::widget::{
    button, checkbox, column, container, pick_list, row, slider,
    text, text_input,
};
use iced::{mouse, task, Element, Length, Point, Rectangle, Task};
use image::DynamicImage;
use preview::{AsciiArtPreview, ColoredChar, PreviewState};

#[derive(Debug, Clone)]
pub enum Message {
    // Image input
    OpenFile,
    PasteFromClipboard,
    ImageLoaded(Result<Vec<u8>, String>),
    ImageDecoded(DynamicImage),

    // Parameters
    WidthChanged(u32),
    CharsetChanged(CharsetPreset),
    CustomCharsetChanged(String),
    ContrastChanged(f64),
    BrightnessChanged(f64),
    SaturationChanged(f64),
    InvertToggled(bool),
    ColorModeChanged(ColorMode),
    BackgroundChanged(Background),
    AspectRatioChanged(f64),

    // Reset
    ResetParams,

    // Preview interaction
    PreviewScroll(mouse::ScrollDelta),
    PreviewDragStart(Point),
    PreviewDrag(Point),
    PreviewDragEnd,
    ResetView,
    CenterPreview,

    // Output
    ExportText,
    ExportHtml,
    CopyText,
    CopyHtml,
    CopyAnsi,

    // Internal
    DebounceConvert,
    ConvertComplete(AsciiArtOutput),
    ShowError(String),
}

#[derive(Debug, Clone, Default)]
pub struct AsciiArt {
    state: AsciiArtState,
    preview_state: PreviewState,
    debounce_handle: Option<task::Handle>,
}

impl PageWithNav for AsciiArt {
    type Message = Message;

    fn update(&mut self, msg: Message) -> Task<Message> {
        match msg {
            Message::OpenFile => {
                return Task::perform(
                    async {
                        let file = rfd::AsyncFileDialog::new()
                            .add_filter("图片", &["png", "jpg", "jpeg", "bmp", "gif", "webp"])
                            .pick_file()
                            .await;

                        match file {
                            Some(handle) => {
                                let path = handle.path().to_owned();
                                match std::fs::read(&path) {
                                    Ok(bytes) => Ok(bytes),
                                    Err(e) => Err(e.to_string()),
                                }
                            }
                            None => Err("未选择文件".to_string()),
                        }
                    },
                    Message::ImageLoaded,
                );
            }
            Message::PasteFromClipboard => {
                return Task::perform(
                    async {
                        match arboard::Clipboard::new() {
                            Ok(mut clipboard) => match clipboard.get_image() {
                                Ok(img_data) => {
                                    // Convert to PNG bytes
                                    let img = image::RgbaImage::from_raw(
                                        img_data.width as u32,
                                        img_data.height as u32,
                                        img_data.bytes.to_vec(),
                                    )
                                    .ok_or("无法解析剪贴板图片")?;

                                    let dynamic = DynamicImage::ImageRgba8(img);
                                    let mut bytes = Vec::new();
                                    dynamic
                                        .write_to(
                                            &mut std::io::Cursor::new(&mut bytes),
                                            image::ImageFormat::Png,
                                        )
                                        .map_err(|e| e.to_string())?;
                                    Ok(bytes)
                                }
                                Err(e) => Err(format!("剪贴板无图片: {}", e)),
                            },
                            Err(e) => Err(format!("无法访问剪贴板: {}", e)),
                        }
                    },
                    Message::ImageLoaded,
                );
            }
            Message::ImageLoaded(result) => {
                match result {
                    Ok(bytes) => {
                        return Task::perform(
                            async move {
                                image::load_from_memory(&bytes).map_err(|e| e.to_string())
                            },
                            |result| match result {
                                Ok(img) => Message::ImageDecoded(img),
                                Err(e) => Message::ShowError(e),
                            },
                        );
                    }
                    Err(e) => {
                        self.state.error_message = Some(e);
                    }
                }
            }
            Message::ImageDecoded(img) => {
                self.state.image_width = img.width();
                self.state.image_height = img.height();
                self.state.original_image = Some(img);
                self.state.error_message = None;
                return self.convert();
            }
            Message::WidthChanged(width) => {
                self.state.width = width.clamp(20, 1000);
                return self.schedule_debounce();
            }
            Message::CharsetChanged(charset) => {
                self.state.charset = charset;
                return self.schedule_debounce();
            }
            Message::CustomCharsetChanged(charset) => {
                self.state.custom_charset = charset;
                if self.state.charset == CharsetPreset::Custom {
                    return self.schedule_debounce();
                }
            }
            Message::ContrastChanged(contrast) => {
                self.state.contrast = contrast.clamp(0.1, 3.0);
                return self.schedule_debounce();
            }
            Message::BrightnessChanged(brightness) => {
                self.state.brightness = brightness.clamp(-1.0, 1.0);
                return self.schedule_debounce();
            }
            Message::SaturationChanged(saturation) => {
                self.state.saturation = saturation.clamp(0.0, 2.0);
                return self.schedule_debounce();
            }
            Message::InvertToggled(invert) => {
                self.state.invert = invert;
                return self.schedule_debounce();
            }
            Message::ColorModeChanged(mode) => {
                self.state.color_mode = mode;
                return self.schedule_debounce();
            }
            Message::BackgroundChanged(bg) => {
                self.state.background = bg;
                return self.schedule_debounce();
            }
            Message::AspectRatioChanged(ratio) => {
                self.state.char_aspect_ratio = ratio.clamp(0.1, 2.0);
                return self.schedule_debounce();
            }
            Message::ResetParams => {
                self.state.width = 80;
                self.state.charset = CharsetPreset::Standard;
                self.state.custom_charset = String::new();
                self.state.contrast = 1.0;
                self.state.brightness = 0.0;
                self.state.saturation = 1.0;
                self.state.invert = false;
                self.state.color_mode = ColorMode::Monochrome;
                self.state.background = Background::Black;
                self.state.char_aspect_ratio = 0.5;
                return self.schedule_debounce();
            }
            Message::PreviewScroll(delta) => {
                // Use estimated viewport bounds
                let bounds = Rectangle {
                    x: 0.0,
                    y: 0.0,
                    width: 600.0,
                    height: 400.0,
                };
                self.preview_state.handle_mouse_scroll(delta, &bounds);
            }
            Message::PreviewDragStart(position) => {
                self.preview_state.handle_mouse_press(position);
            }
            Message::PreviewDrag(position) => {
                // handle_mouse_move returns true if offset changed
                self.preview_state.handle_mouse_move(position);
            }
            Message::PreviewDragEnd => {
                self.preview_state.handle_mouse_release();
            }
            Message::ResetView => {
                let bounds = Rectangle {
                    x: 0.0,
                    y: 0.0,
                    width: 600.0,
                    height: 400.0,
                };
                self.preview_state.reset_view(&bounds);
            }
            Message::CenterPreview => {
                let bounds = Rectangle {
                    x: 0.0,
                    y: 0.0,
                    width: 600.0,
                    height: 400.0,
                };
                self.preview_state.center_in_viewport(&bounds);
            }
            Message::DebounceConvert => {
                self.debounce_handle = None;
                return self.convert();
            }
            Message::ExportText => {
                if !self.state.ascii_text.is_empty() {
                    return Task::perform(
                        async {
                            let file = rfd::AsyncFileDialog::new()
                                .add_filter("文本文件", &["txt"])
                                .save_file()
                                .await;

                            if let Some(handle) = file {
                                let path = handle.path().to_owned();
                                // Will be handled by the caller
                                return Some(path.to_string_lossy().to_string());
                            }
                            None
                        },
                        |path| {
                            if let Some(_p) = path {
                                // TODO: Save file
                            }
                            Message::ShowError("导出功能待实现".to_string())
                        },
                    );
                }
            }
            Message::ExportHtml => {
                if !self.state.colored_html.is_empty() {
                    return Task::done(Message::ShowError("导出功能待实现".to_string()));
                }
            }
            Message::CopyText => {
                if !self.state.ascii_text.is_empty() {
                    let text = self.state.ascii_text.clone();
                    return Task::perform(
                        async move {
                            match arboard::Clipboard::new() {
                                Ok(mut clipboard) => {
                                    clipboard.set_text(text).ok();
                                    Ok(())
                                }
                                Err(e) => Err(e.to_string()),
                            }
                        },
                        |result| match result {
                            Ok(()) => Message::ShowError("已复制到剪贴板".to_string()),
                            Err(e) => Message::ShowError(e),
                        },
                    );
                }
            }
            Message::CopyHtml => {
                if !self.state.colored_html.is_empty() {
                    let html = self.state.colored_html.clone();
                    return Task::perform(
                        async move {
                            match arboard::Clipboard::new() {
                                Ok(mut clipboard) => {
                                    clipboard.set_html(html, None).ok();
                                    Ok(())
                                }
                                Err(e) => Err(e.to_string()),
                            }
                        },
                        |result| match result {
                            Ok(()) => Message::ShowError("已复制HTML到剪贴板".to_string()),
                            Err(e) => Message::ShowError(e),
                        },
                    );
                }
            }
            Message::CopyAnsi => {
                if !self.state.ansi_text.is_empty() {
                    let text = self.state.ansi_text.clone();
                    return Task::perform(
                        async move {
                            match arboard::Clipboard::new() {
                                Ok(mut clipboard) => {
                                    clipboard.set_text(text).ok();
                                    Ok(())
                                }
                                Err(e) => Err(e.to_string()),
                            }
                        },
                        |result| match result {
                            Ok(()) => Message::ShowError("已复制ANSI到剪贴板".to_string()),
                            Err(e) => Message::ShowError(e),
                        },
                    );
                }
            }
            Message::ConvertComplete(output) => {
                self.state.ascii_text = output.plain_text;
                self.state.colored_html = output.html_text;
                self.state.ansi_text = output.ansi_text.clone();
                self.state.is_converting = false;

                // Update preview state with colored content
                self.update_preview_content();

                // Center the preview after content update
                return Task::done(Message::CenterPreview);
            }
            Message::ShowError(msg) => {
                self.state.error_message = Some(msg);
            }
        }
        Task::none()
    }

    fn view(&self) -> Element<'_, Message> {
        let has_image = self.state.original_image.is_some();

        // Top toolbar
        let toolbar = container(
            row![
                button(text("打开图片").size(13))
                    .on_press(Message::OpenFile)
                    .padding([8, 16]),
                button(text("粘贴剪贴板").size(13))
                    .on_press(Message::PasteFromClipboard)
                    .padding([8, 16]),
                iced::widget::Space::new().width(Length::Fill),
                if has_image {
                    text(format!(
                        "原始尺寸: {}×{}",
                        self.state.image_width, self.state.image_height
                    ))
                    .size(12)
                } else {
                    text("请选择或粘贴图片").size(12)
                },
            ]
            .spacing(12)
            .align_y(iced::Alignment::Center),
        )
        .padding([8, 12]);

        // Main content area
        let content = if has_image {
            // Left: Image preview info
            let image_info = container(
                column![
                    text("原图信息").size(14),
                    text(format!("宽度: {} px", self.state.image_width)).size(12),
                    text(format!("高度: {} px", self.state.image_height)).size(12),
                    text(format!("输出宽度: {} 字符", self.state.width)).size(12),
                    text(format!("缩放: {:.0}%", self.preview_state.zoom * 100.0)).size(12),
                ]
                .spacing(4),
            )
            .padding(12)
            .width(Length::FillPortion(1))
            .style(|_theme| container::Style {
                background: Some(iced::Color::from_rgb8(0x2D, 0x2D, 0x30).into()),
                border: iced::Border {
                    radius: 8.0.into(),
                    width: 1.0,
                    color: iced::Color::from_rgb8(0x3E, 0x3E, 0x42),
                },
                ..Default::default()
            });

            // Right: ASCII art preview with color support
            let preview_content: Element<'_, Message> = if self.state.is_converting {
                container(
                    column![
                        text("⏳").size(32),
                        text("正在转换...").size(14),
                    ]
                    .spacing(12)
                    .align_x(iced::Alignment::Center),
                )
                .center_x(Length::Fill)
                .center_y(Length::Fill)
                .into()
            } else {
                AsciiArtPreview::new(&self.preview_state)
                    .on_scroll(Message::PreviewScroll)
                    .on_press(Message::PreviewDragStart)
                    .on_drag(Message::PreviewDrag)
                    .on_release(|| Message::PreviewDragEnd)
                    .into()
            };

            let preview = container(
                column![
                    row![
                        text("字符画预览").size(14),
                        iced::widget::Space::new().width(Length::Fill),
                        button(text("重置视图").size(11))
                            .on_press(Message::ResetView)
                            .padding([4, 10]),
                        if self.state.is_converting {
                            button(text("转换中...").size(11))
                                .padding([4, 10])
                        } else {
                            button(text("复制文本").size(11))
                                .on_press(Message::CopyText)
                                .padding([4, 10])
                        },
                        if !self.state.is_converting {
                            button(text("复制HTML").size(11))
                                .on_press(Message::CopyHtml)
                                .padding([4, 10])
                        } else {
                            button(text("复制HTML").size(11))
                                .padding([4, 10])
                        },
                        if !self.state.is_converting {
                            button(text("复制ANSI").size(11))
                                .on_press(Message::CopyAnsi)
                                .padding([4, 10])
                        } else {
                            button(text("复制ANSI").size(11))
                                .padding([4, 10])
                        },
                    ]
                    .spacing(8)
                    .align_y(iced::Alignment::Center),
                    preview_content,
                ]
                .spacing(8),
            )
            .padding(12)
            .width(Length::FillPortion(2))
            .height(Length::Fill)
            .style(|_theme| container::Style {
                background: Some(iced::Color::from_rgb8(0x1E, 0x1E, 0x1E).into()),
                border: iced::Border {
                    radius: 8.0.into(),
                    width: 1.0,
                    color: iced::Color::from_rgb8(0x3E, 0x3E, 0x42),
                },
                ..Default::default()
            });

            row![image_info, preview].spacing(12).height(Length::Fill)
        } else {
            row![
                container(
                    text("请选择图片或从剪贴板粘贴")
                        .size(16)
                        .style(|_theme| iced::widget::text::Style {
                            color: Some(iced::Color::from_rgb8(0x9C, 0xA3, 0xAF)),
                        })
                )
                .center_x(Length::Fill)
                .center_y(Length::Fill)
            ]
        };

        // Parameter controls
        let controls = self.build_controls();

        // Error message
        let error = if let Some(err) = &self.state.error_message {
            container(
                text(err.as_str())
                    .size(12)
                    .style(|_theme| iced::widget::text::Style {
                        color: Some(iced::Color::from_rgb8(0xEF, 0x44, 0x44)),
                    }),
            )
            .padding([4, 12])
        } else {
            container(text(""))
        };

        column![toolbar, content, controls, error]
            .spacing(8)
            .padding(12)
            .width(Length::Fill)
            .height(Length::Fill)
            .into()
    }
}

impl AsciiArt {
    fn schedule_debounce(&mut self) -> Task<Message> {
        // Cancel previous debounce task if any
        if let Some(handle) = self.debounce_handle.take() {
            handle.abort();
        }

        // Create new debounce task with 500ms delay
        let (task, handle) = Task::perform(
            async {
                tokio::time::sleep(std::time::Duration::from_millis(500)).await;
            },
            |_| Message::DebounceConvert,
        )
        .abortable();

        self.debounce_handle = Some(handle);
        task
    }

    fn convert(&mut self) -> Task<Message> {
        if self.state.original_image.is_none() {
            return Task::none();
        }

        self.state.is_converting = true;
        let state = self.state.clone();

        Task::perform(
            async move {
                tokio::task::spawn_blocking(move || AsciiArtEngine::convert(&state))
                    .await
                    .unwrap_or_else(|e| Err(e.to_string()))
            },
            |result| match result {
                Ok(output) => Message::ConvertComplete(output),
                Err(e) => Message::ShowError(e),
            },
        )
    }

    fn update_preview_content(&mut self) {
        let colored_chars = match self.state.color_mode {
            ColorMode::Monochrome => {
                // For monochrome, use white text
                self.state
                    .ascii_text
                    .lines()
                    .map(|line| {
                        line.chars()
                            .map(|ch| ColoredChar {
                                ch,
                                color: iced::Color::WHITE,
                            })
                            .collect()
                    })
                    .collect()
            }
            ColorMode::Html | ColorMode::TrueColor | ColorMode::Ansi256 => {
                // Parse ANSI colored text
                self.parse_ansi_text(&self.state.ansi_text)
            }
        };

        self.preview_state.set_content(colored_chars);
    }

    fn parse_ansi_text(&self, text: &str) -> Vec<Vec<ColoredChar>> {
        let mut lines = Vec::new();
        let mut current_line = Vec::new();
        let mut current_color = iced::Color::WHITE;

        let bytes = text.as_bytes();
        let len = bytes.len();
        let mut i = 0;

        while i < len {
            let ch = bytes[i];

            if ch == b'\n' {
                lines.push(std::mem::take(&mut current_line));
                i += 1;
                continue;
            }

            if ch == b'\x1b' && i + 1 < len && bytes[i + 1] == b'[' {
                // Parse ANSI escape sequence
                i += 2; // skip \x1b[
                let start = i;
                while i < len && bytes[i] != b'm' {
                    i += 1;
                }
                if i < len {
                    let params = &text[start..i];
                    if let Some(color) = Self::parse_ansi_color_fast(params) {
                        current_color = color;
                    }
                    i += 1; // skip 'm'
                }
                continue;
            }

            // For ASCII characters (most common case), skip UTF-8 decoding
            if ch < 128 {
                current_line.push(ColoredChar {
                    ch: ch as char,
                    color: current_color,
                });
                i += 1;
            } else {
                // Handle UTF-8 multi-byte characters
                if let Some((ch, len)) = Self::decode_utf8_char(&bytes[i..]) {
                    current_line.push(ColoredChar {
                        ch,
                        color: current_color,
                    });
                    i += len;
                } else {
                    i += 1;
                }
            }
        }

        if !current_line.is_empty() {
            lines.push(current_line);
        }

        lines
    }

    #[inline]
    fn decode_utf8_char(bytes: &[u8]) -> Option<(char, usize)> {
        if bytes.is_empty() {
            return None;
        }
        let b = bytes[0];
        let (len, code) = if b < 0x80 {
            (1, b as u32)
        } else if b < 0xE0 {
            if bytes.len() < 2 {
                return None;
            }
            (2, ((b & 0x1F) as u32) << 6 | ((bytes[1] & 0x3F) as u32))
        } else if b < 0xF0 {
            if bytes.len() < 3 {
                return None;
            }
            (
                3,
                ((b & 0x0F) as u32) << 12
                    | ((bytes[1] & 0x3F) as u32) << 6
                    | ((bytes[2] & 0x3F) as u32),
            )
        } else {
            if bytes.len() < 4 {
                return None;
            }
            (
                4,
                ((b & 0x07) as u32) << 18
                    | ((bytes[1] & 0x3F) as u32) << 12
                    | ((bytes[2] & 0x3F) as u32) << 6
                    | ((bytes[3] & 0x3F) as u32),
            )
        };
        char::from_u32(code).map(|c| (c, len))
    }

    fn parse_ansi_color_fast(params: &str) -> Option<iced::Color> {
        let mut parts = params.split(';');

        while let Some(part) = parts.next() {
            match part {
                "0" => return Some(iced::Color::WHITE),
                "38" => {
                    match parts.next() {
                        Some("5") => {
                            // 256-color mode
                            if let Some(num_str) = parts.next() {
                                if let Ok(color_num) = num_str.parse::<u8>() {
                                    return Some(Self::ansi256_to_color(color_num));
                                }
                            }
                        }
                        Some("2") => {
                            // True color mode
                            if let (Some(r_str), Some(g_str), Some(b_str)) =
                                (parts.next(), parts.next(), parts.next())
                            {
                                if let (Ok(r), Ok(g), Ok(b)) = (
                                    r_str.parse::<u8>(),
                                    g_str.parse::<u8>(),
                                    b_str.parse::<u8>(),
                                ) {
                                    return Some(iced::Color::from_rgb8(r, g, b));
                                }
                            }
                        }
                        _ => {}
                    }
                }
                _ => {}
            }
        }

        None
    }

    fn ansi256_to_color(n: u8) -> iced::Color {
        if n < 16 {
            // Standard colors
            let (r, g, b) = match n {
                0 => (0, 0, 0),
                1 => (128, 0, 0),
                2 => (0, 128, 0),
                3 => (128, 128, 0),
                4 => (0, 0, 128),
                5 => (128, 0, 128),
                6 => (0, 128, 128),
                7 => (192, 192, 192),
                8 => (128, 128, 128),
                9 => (255, 0, 0),
                10 => (0, 255, 0),
                11 => (255, 255, 0),
                12 => (0, 0, 255),
                13 => (255, 0, 255),
                14 => (0, 255, 255),
                15 => (255, 255, 255),
                _ => (0, 0, 0),
            };
            iced::Color::from_rgb8(r, g, b)
        } else if n < 232 {
            // 6x6x6 color cube
            let n = n - 16;
            let r = (n / 36) * 51;
            let g = ((n % 36) / 6) * 51;
            let b = (n % 6) * 51;
            iced::Color::from_rgb8(r, g, b)
        } else {
            // Grayscale
            let gray = 8 + (n - 232) * 10;
            iced::Color::from_rgb8(gray, gray, gray)
        }
    }

    fn build_controls(&self) -> Element<'_, Message> {
        // Width slider
        let width_control = row![
            text("输出宽度").size(12).width(Length::Fixed(70.0)),
            slider(20..=1000, self.state.width, |v| {
                Message::WidthChanged(v as u32)
            })
            .width(Length::Fill),
            text(format!("{}", self.state.width)).size(12).width(Length::Fixed(40.0)),
        ]
        .spacing(8)
        .align_y(iced::Alignment::Center);

        // Contrast slider
        let contrast_control = row![
            text("对比度").size(12).width(Length::Fixed(70.0)),
            slider(0.1..=3.0, self.state.contrast, Message::ContrastChanged)
                .step(0.1)
                .width(Length::Fill),
            text(format!("{:.1}", self.state.contrast))
                .size(12)
                .width(Length::Fixed(40.0)),
        ]
        .spacing(8)
        .align_y(iced::Alignment::Center);

        // Brightness slider
        let brightness_control = row![
            text("亮度").size(12).width(Length::Fixed(70.0)),
            slider(-1.0..=1.0, self.state.brightness, Message::BrightnessChanged)
                .step(0.1)
                .width(Length::Fill),
            text(format!("{:.1}", self.state.brightness))
                .size(12)
                .width(Length::Fixed(40.0)),
        ]
        .spacing(8)
        .align_y(iced::Alignment::Center);

        // Saturation slider
        let saturation_control = row![
            text("饱和度").size(12).width(Length::Fixed(70.0)),
            slider(0.0..=2.0, self.state.saturation, Message::SaturationChanged)
                .step(0.1)
                .width(Length::Fill),
            text(format!("{:.1}", self.state.saturation))
                .size(12)
                .width(Length::Fixed(40.0)),
        ]
        .spacing(8)
        .align_y(iced::Alignment::Center);

        // Aspect ratio slider
        let aspect_control = row![
            text("宽高比").size(12).width(Length::Fixed(70.0)),
            slider(0.1..=2.0, self.state.char_aspect_ratio, Message::AspectRatioChanged)
                .step(0.1)
                .width(Length::Fill),
            text(format!("{:.1}", self.state.char_aspect_ratio))
                .size(12)
                .width(Length::Fixed(40.0)),
        ]
        .spacing(8)
        .align_y(iced::Alignment::Center);

        // Charset and color mode
        let charset_control = row![
            text("字符集").size(12).width(Length::Fixed(70.0)),
            pick_list(
                CharsetPreset::all(),
                Some(self.state.charset.clone()),
                Message::CharsetChanged,
            )
            .width(Length::Fixed(100.0)),
            if self.state.charset == CharsetPreset::Custom {
                text_input("自定义字符集", &self.state.custom_charset)
                    .on_input(Message::CustomCharsetChanged)
                    .width(Length::Fixed(150.0))
            } else {
                text_input("", "")
                    .width(Length::Fixed(150.0))
            },
        ]
        .spacing(8)
        .align_y(iced::Alignment::Center);

        let color_control = row![
            text("颜色模式").size(12).width(Length::Fixed(70.0)),
            pick_list(
                ColorMode::all(),
                Some(self.state.color_mode.clone()),
                Message::ColorModeChanged,
            )
            .width(Length::Fixed(100.0)),
            text("背景色").size(12).width(Length::Fixed(50.0)),
            pick_list(
                Background::all(),
                Some(self.state.background.clone()),
                Message::BackgroundChanged,
            )
            .width(Length::Fixed(80.0)),
        ]
        .spacing(8)
        .align_y(iced::Alignment::Center);

        // Checkboxes
        let checkbox_control = row![
            checkbox(self.state.invert)
                .on_toggle(Message::InvertToggled),
            text("反转亮度").size(12),
        ]
        .spacing(4)
        .align_y(iced::Alignment::Center);

        // Left column
        let left_col = column![
            width_control,
            contrast_control,
            brightness_control,
        ]
        .spacing(8);

        // Right column
        let right_col = column![
            saturation_control,
            aspect_control,
            checkbox_control,
        ]
        .spacing(8);

        // Bottom row
        let bottom_row = row![
            charset_control,
            color_control,
            iced::widget::Space::new().width(Length::Fill),
            button(text("重置参数").size(12))
                .on_press(Message::ResetParams)
                .padding([6, 14]),
        ]
        .spacing(24)
        .wrap();

        container(
            column![
                row![left_col, right_col].spacing(24),
                bottom_row,
            ]
            .spacing(12),
        )
        .padding(12)
        .style(|_theme| container::Style {
            background: Some(iced::Color::from_rgb8(0x2D, 0x2D, 0x30).into()),
            border: iced::Border {
                radius: 8.0.into(),
                width: 1.0,
                color: iced::Color::from_rgb8(0x3E, 0x3E, 0x42),
            },
            ..Default::default()
        })
        .into()
    }
}
