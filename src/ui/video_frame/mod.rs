use crate::model::video_frame_state::{
    ExtractMode, ExtractParams, OutputFormat, VideoFrameState, VideoInfo,
};
use crate::themes::get_theme;
use crate::ui::PageWithNav;
use crate::utils::video_frame_engine::VideoFrameEngine;
use iced::widget::{
    button, column, container, image, pick_list, progress_bar, radio,
    row, scrollable, text, text_input,
};
use iced::{Element, Length, Task};

#[derive(Debug, Clone)]
pub enum Message {
    // File selection
    OpenVideo,
    VideoLoaded(Result<std::path::PathBuf, String>),
    VideoProbed(Result<VideoInfo, String>),

    // Parameters
    ExtractModeChanged(ExtractMode),
    IntervalChanged(String),
    FrameCountChanged(String),
    TimePointsChanged(String),
    OutputFormatChanged(OutputFormat),
    JpegQualityChanged(u8),
    ResizeWidthChanged(String),
    SelectOutputDir,
    OutputDirSelected(Option<std::path::PathBuf>),

    // Execution
    StartExtract,
    ExtractComplete(Result<Vec<crate::model::video_frame_state::ExtractedFrame>, String>),

    // Preview
    FrameSelected(usize),
    ExportFrames,
    ExportComplete(Result<String, String>),

    // FFmpeg check
    #[allow(dead_code)]
    FfmpegCheckComplete(bool),
    #[allow(dead_code)]
    ShowError(String),
}

#[derive(Debug, Clone, Default)]
pub struct VideoFrame {
    state: VideoFrameState,
}

impl PageWithNav for VideoFrame {
    type Message = Message;

    fn update(&mut self, msg: Message) -> Task<Message> {
        match msg {
            Message::OpenVideo => {
                return Task::perform(
                    async {
                        let file = rfd::AsyncFileDialog::new()
                            .add_filter(
                                "视频文件",
                                &["mp4", "avi", "mkv", "mov", "webm", "flv", "wmv", "ts", "m4v"],
                            )
                            .pick_file()
                            .await;

                        match file {
                            Some(handle) => Ok(handle.path().to_owned()),
                            None => Err("未选择文件".to_string()),
                        }
                    },
                    Message::VideoLoaded,
                );
            }
            Message::VideoLoaded(result) => match result {
                Ok(path) => {
                    self.state.video_path = Some(path.clone());
                    self.state.frames.clear();
                    self.state.selected_frame = None;
                    self.state.error_message = None;
                    return Task::perform(
                        async move {
                            tokio::task::spawn_blocking(move || {
                                VideoFrameEngine::probe_video(&path)
                            })
                            .await
                            .unwrap_or_else(|e| Err(anyhow::anyhow!("{}", e)))
                        },
                        |result| match result {
                            Ok(info) => Message::VideoProbed(Ok(info)),
                            Err(e) => Message::VideoProbed(Err(e.to_string())),
                        },
                    );
                }
                Err(e) => {
                    self.state.error_message = Some(e);
                }
            },
            Message::VideoProbed(result) => match result {
                Ok(info) => {
                    // Set default output dir
                    if let Some(ref video_path) = self.state.video_path {
                        let parent = video_path.parent().unwrap_or(std::path::Path::new("."));
                        let stem = video_path
                            .file_stem()
                            .and_then(|s| s.to_str())
                            .unwrap_or("output");
                        let dir_name = format!("{}_frames", stem);
                        self.state.output_dir = Some(parent.join(dir_name));
                    }
                    self.state.video_info = Some(info);
                    self.state.error_message = None;
                }
                Err(e) => {
                    self.state.error_message = Some(e.to_string());
                }
            },
            Message::ExtractModeChanged(mode) => {
                self.state.extract_mode = mode;
            }
            Message::IntervalChanged(val) => {
                if let Ok(v) = val.parse::<f64>() {
                    if v > 0.0 {
                        self.state.interval_secs = v;
                    }
                }
            }
            Message::FrameCountChanged(val) => {
                if let Ok(v) = val.parse::<u32>() {
                    if v > 0 {
                        self.state.frame_count = v;
                    }
                }
            }
            Message::TimePointsChanged(val) => {
                self.state.time_points_input = val;
            }
            Message::OutputFormatChanged(fmt) => {
                self.state.output_format = fmt;
            }
            Message::JpegQualityChanged(q) => {
                self.state.jpeg_quality = q;
            }
            Message::ResizeWidthChanged(val) => {
                if val.trim().is_empty() {
                    self.state.resize_width = None;
                } else if let Ok(v) = val.parse::<u32>() {
                    if v > 0 {
                        self.state.resize_width = Some(v);
                    }
                }
            }
            Message::SelectOutputDir => {
                return Task::perform(
                    async {
                        let folder = rfd::AsyncFileDialog::new()
                            .set_title("选择输出目录")
                            .pick_folder()
                            .await;
                        folder.map(|f| f.path().to_owned())
                    },
                    Message::OutputDirSelected,
                );
            }
            Message::OutputDirSelected(dir) => {
                if let Some(d) = dir {
                    self.state.output_dir = Some(d);
                }
            }
            Message::StartExtract => {
                if self.state.video_path.is_none() {
                    self.state.error_message = Some("请先选择视频文件".to_string());
                    return Task::none();
                }

                self.state.is_extracting = true;
                self.state.error_message = None;
                self.state.frames.clear();
                self.state.selected_frame = None;
                self.state.progress = 0.0;

                let time_points = match self.state.extract_mode {
                    ExtractMode::ByInterval => vec![self.state.interval_secs],
                    ExtractMode::ByCount => vec![self.state.frame_count as f64],
                    ExtractMode::ByTimePoints => self
                        .state
                        .time_points_input
                        .split(',')
                        .filter_map(|s| s.trim().parse::<f64>().ok())
                        .collect(),
                    ExtractMode::AllFrames => vec![],
                };

                let params = ExtractParams {
                    video_path: self.state.video_path.clone().unwrap(),
                    mode: self.state.extract_mode,
                    interval_secs: self.state.interval_secs,
                    frame_count: self.state.frame_count,
                    time_points,
                    output_format: self.state.output_format,
                    jpeg_quality: self.state.jpeg_quality,
                    resize_width: self.state.resize_width,
                };

                return Task::perform(
                    async move {
                        tokio::task::spawn_blocking(move || {
                            VideoFrameEngine::extract_frames(&params, |_progress| {})
                        })
                        .await
                        .unwrap_or_else(|e| Err(anyhow::anyhow!("{}", e)))
                    },
                    |result| match result {
                        Ok(frames) => Message::ExtractComplete(Ok(frames)),
                        Err(e) => Message::ExtractComplete(Err(e.to_string())),
                    },
                );
            }
            Message::ExtractComplete(result) => {
                self.state.is_extracting = false;
                match result {
                    Ok(frames) => {
                        self.state.progress = 1.0;
                        self.state.frames = frames;
                        self.state.error_message = None;
                    }
                    Err(e) => {
                        self.state.error_message = Some(e);
                    }
                }
            }
            Message::FrameSelected(idx) => {
                self.state.selected_frame = Some(idx);
            }
            Message::ExportFrames => {
                if self.state.frames.is_empty() {
                    self.state.error_message = Some("没有可导出的帧".to_string());
                    return Task::none();
                }

                let output_dir = self.state.output_dir.clone().unwrap_or_else(|| {
                    std::path::PathBuf::from("video_frames")
                });
                let frames = self.state.frames.clone();
                let is_all_frames = self.state.extract_mode == ExtractMode::AllFrames;
                let fps = self
                    .state
                    .video_info
                    .as_ref()
                    .map(|i| i.fps)
                    .unwrap_or(30.0);
                let video_path = self.state.video_path.clone().unwrap();
                let width = self
                    .state
                    .video_info
                    .as_ref()
                    .map(|i| i.width)
                    .unwrap_or(0);
                let height = self
                    .state
                    .video_info
                    .as_ref()
                    .map(|i| i.height)
                    .unwrap_or(0);

                return Task::perform(
                    async move {
                        tokio::task::spawn_blocking(move || -> Result<String, String> {
                            std::fs::create_dir_all(&output_dir)
                                .map_err(|e| format!("创建输出目录失败: {}", e))?;

                            for frame in &frames {
                                let path = if is_all_frames {
                                    // AllFrames mode: sequential naming for video reconstruction
                                    let ext = frame
                                        .filename
                                        .rsplit('.')
                                        .next()
                                        .unwrap_or("png");
                                    output_dir.join(format!(
                                        "frame_{:06}.{}",
                                        frame.index, ext
                                    ))
                                } else {
                                    output_dir.join(&frame.filename)
                                };
                                std::fs::write(&path, &frame.image_data)
                                    .map_err(|e| format!("写入文件失败: {}", e))?;
                            }

                            // Write meta.json for AllFrames mode
                            if is_all_frames {
                                let meta = format!(
                                    r#"{{
  "source": "{}",
  "fps": {},
  "width": {},
  "height": {},
  "total_frames": {},
  "mode": "all_frames"
}}"#,
                                    video_path.to_string_lossy().replace('\\', "/").replace('"', "\\\""),
                                    fps,
                                    width,
                                    height,
                                    frames.len(),
                                );
                                let meta_path = output_dir.join("meta.json");
                                std::fs::write(&meta_path, meta)
                                    .map_err(|e| format!("写入 meta.json 失败: {}", e))?;
                            }

                            Ok(format!(
                                "已导出 {} 帧到 {}",
                                frames.len(),
                                output_dir.display()
                            ))
                        })
                        .await
                        .unwrap_or_else(|e| Err(e.to_string()))
                    },
                    Message::ExportComplete,
                );
            }
            Message::ExportComplete(result) => match result {
                Ok(msg) => {
                    self.state.error_message = None;
                    // Show success as a temporary message
                    self.state.error_message = Some(msg);
                }
                Err(e) => {
                    self.state.error_message = Some(e);
                }
            },
            Message::FfmpegCheckComplete(available) => {
                self.state.ffmpeg_available = available;
                if !available {
                    self.state.error_message =
                        Some("未检测到 FFmpeg，请安装 FFmpeg 并添加到系统 PATH".to_string());
                }
            }
            Message::ShowError(e) => {
                self.state.error_message = Some(e);
            }
        }
        Task::none()
    }

    fn view(&self) -> Element<'_, Message> {
        let has_video = self.state.video_path.is_some() && self.state.video_info.is_some();
        let has_frames = !self.state.frames.is_empty();

        // Toolbar
        let toolbar = container(
            row![
                button(text("选择视频").size(13))
                    .on_press(Message::OpenVideo)
                    .padding([8, 16]),
                button(text("选择输出目录").size(13))
                    .on_press(Message::SelectOutputDir)
                    .padding([8, 16]),
                iced::widget::Space::new().width(Length::Fill),
                if self.state.is_extracting {
                    button(text("抽取中...").size(13)).padding([8, 16])
                } else if has_video {
                    button(text("开始抽帧").size(13))
                        .on_press(Message::StartExtract)
                        .padding([8, 16])
                } else {
                    button(text("开始抽帧").size(13)).padding([8, 16])
                },
                if has_frames {
                    button(text("导出帧").size(13))
                        .on_press(Message::ExportFrames)
                        .padding([8, 16])
                } else {
                    button(text("导出帧").size(13)).padding([8, 16])
                },
            ]
            .spacing(12)
            .align_y(iced::Alignment::Center),
        )
        .padding([8, 12]);

        // Main content
        let content = if has_video {
            let info = self.state.video_info.as_ref().unwrap();

            // Left panel: video info + parameters
            let params_panel = self.build_params_panel(info);

            // Right panel: frame preview grid
            let preview_panel = self.build_preview_panel();

            let content: Element<'_, Message> = row![params_panel, preview_panel]
                .spacing(12)
                .height(Length::Fill)
                .into();
            content
        } else {
            let placeholder: Element<'_, Message> = container(
                column![
                    text("请选择视频文件").size(16).style(|theme| {
                        let c_theme = get_theme(theme);
                        c_theme.secondary_text_style()
                    }),
                    text("支持格式: MP4, AVI, MKV, MOV, WebM, FLV 等")
                        .size(12)
                        .style(|theme| {
                            let c_theme = get_theme(theme);
                            c_theme.muted_text_style()
                        }),
                ]
                .spacing(8)
                .align_x(iced::Alignment::Center),
            )
            .center_x(Length::Fill)
            .center_y(Length::Fill)
            .into();
            placeholder
        };

        // Progress bar
        let progress = if self.state.is_extracting {
            container(
                row![
                    text("正在抽取帧...").size(12),
                    container(progress_bar(0.0..=1.0, self.state.progress))
                        .width(Length::Fill)
                        .height(Length::Fixed(8.0)),
                    text(format!("{:.0}%", self.state.progress * 100.0)).size(12),
                ]
                .spacing(12)
                .align_y(iced::Alignment::Center),
            )
            .padding([8, 12])
        } else {
            container(text(""))
        };

        // Status bar
        let status = self.build_status_bar();

        // Error message
        let error = if let Some(err) = &self.state.error_message {
            container(
                text(err.as_str()).size(12).style(|theme| {
                    let c_theme = get_theme(theme);
                    c_theme.error_text_style()
                }),
            )
            .padding([4, 12])
        } else {
            container(text(""))
        };

        column![toolbar, content, progress, error, status]
            .spacing(8)
            .padding(12)
            .width(Length::Fill)
            .height(Length::Fill)
            .into()
    }
}

impl VideoFrame {
    fn build_params_panel<'a>(&self, info: &VideoInfo) -> Element<'a, Message> {
        // Video info section
        let video_info_section = column![
            text("视频信息").size(14),
            text(format!("分辨率: {}×{}", info.width, info.height)).size(12),
            text(format!("帧率: {:.2} fps", info.fps)).size(12),
            text(format!("时长: {:.2} 秒", info.duration)).size(12),
            text(format!("总帧数: {}", info.total_frames)).size(12),
        ]
        .spacing(4);

        // Extract mode
        let current_mode = self.state.extract_mode;
        let mode_section = column![
            text("抽取模式").size(14),
            radio(
                "全部帧",
                ExtractMode::AllFrames,
                Some(current_mode),
                Message::ExtractModeChanged,
            )
            .text_size(13),
            radio(
                "按间隔",
                ExtractMode::ByInterval,
                Some(current_mode),
                Message::ExtractModeChanged,
            )
            .text_size(13),
            radio(
                "按数量",
                ExtractMode::ByCount,
                Some(current_mode),
                Message::ExtractModeChanged,
            )
            .text_size(13),
            radio(
                "按时间点",
                ExtractMode::ByTimePoints,
                Some(current_mode),
                Message::ExtractModeChanged,
            )
            .text_size(13),
        ]
        .spacing(4);

        // Mode-specific parameters
        let mode_params: Element<'_, Message> = match self.state.extract_mode {
            ExtractMode::AllFrames => {
                container(
                    text(format!("将抽取全部 {} 帧", info.total_frames))
                        .size(12)
                        .style(|theme| {
                            let c_theme = get_theme(theme);
                            c_theme.secondary_text_style()
                        }),
                )
                .into()
            }
            ExtractMode::ByInterval => container(
                row![
                    text("间隔(秒)").size(12).width(Length::Fixed(65.0)),
                    text_input("1.0", &format!("{}", self.state.interval_secs))
                        .on_input(Message::IntervalChanged)
                        .width(Length::Fixed(80.0)),
                ]
                .spacing(8)
                .align_y(iced::Alignment::Center),
            )
            .into(),
            ExtractMode::ByCount => container(
                row![
                    text("抽取数量").size(12).width(Length::Fixed(65.0)),
                    text_input("10", &format!("{}", self.state.frame_count))
                        .on_input(Message::FrameCountChanged)
                        .width(Length::Fixed(80.0)),
                ]
                .spacing(8)
                .align_y(iced::Alignment::Center),
            )
            .into(),
            ExtractMode::ByTimePoints => container(
                column![
                    text("时间点(秒，逗号分隔)").size(12),
                    text_input("1.5, 3.0, 5.0", &self.state.time_points_input)
                        .on_input(Message::TimePointsChanged)
                        .width(Length::Fill),
                ]
                .spacing(4),
            )
            .into(),
        };

        // Output format
        let format_section = row![
            text("输出格式").size(12).width(Length::Fixed(65.0)),
            pick_list(
                OutputFormat::all(),
                Some(self.state.output_format),
                Message::OutputFormatChanged,
            )
            .width(Length::Fixed(80.0)),
        ]
        .spacing(8)
        .align_y(iced::Alignment::Center);

        // JPEG quality (only when JPEG selected)
        let quality_section: Element<'_, Message> =
            if self.state.output_format == OutputFormat::Jpeg {
                row![
                    text("JPEG 质量").size(12).width(Length::Fixed(65.0)),
                    iced::widget::slider(
                        1.0..=100.0,
                        self.state.jpeg_quality as f64,
                        |v| Message::JpegQualityChanged(v.round() as u8),
                    )
                    .step(1.0)
                    .width(Length::Fill),
                    text(format!("{}", self.state.jpeg_quality))
                        .size(12)
                        .width(Length::Fixed(30.0)),
                ]
                .spacing(8)
                .align_y(iced::Alignment::Center)
                .into()
            } else {
                container(text("")).into()
            };

        // Resize width
        let resize_section = row![
            text("缩放宽度").size(12).width(Length::Fixed(65.0)),
            text_input(
                "原始",
                &self
                    .state
                    .resize_width
                    .map(|w| w.to_string())
                    .unwrap_or_default()
            )
            .on_input(Message::ResizeWidthChanged)
            .width(Length::Fixed(80.0)),
            text("px (留空保持原始)").size(11).style(|theme| {
                let c_theme = get_theme(theme);
                c_theme.muted_text_style()
            }),
        ]
        .spacing(8)
        .align_y(iced::Alignment::Center);

        // Output dir display
        let output_dir_text = self
            .state
            .output_dir
            .as_ref()
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or_else(|| "未设置".to_string());

        let output_section = column![
            text("输出目录").size(12),
            text(output_dir_text.clone()).size(11).style(|theme| {
                let c_theme = get_theme(theme);
                c_theme.muted_text_style()
            }),
        ]
        .spacing(2);

        container(
            column![
                video_info_section,
                iced::widget::Space::new().height(Length::Fixed(12.0)),
                mode_section,
                iced::widget::Space::new().height(Length::Fixed(8.0)),
                mode_params,
                iced::widget::Space::new().height(Length::Fixed(12.0)),
                format_section,
                quality_section,
                iced::widget::Space::new().height(Length::Fixed(8.0)),
                resize_section,
                iced::widget::Space::new().height(Length::Fixed(12.0)),
                output_section,
            ]
            .spacing(4),
        )
        .padding(12)
        .width(Length::Fixed(240.0))
        .height(Length::Fill)
        .style(|theme| {
            let c_theme = get_theme(theme);
            c_theme.card_container_style()
        })
        .into()
    }

    fn build_preview_panel<'a>(&self) -> Element<'a, Message> {
        if self.state.is_extracting {
            return container(
                column![
                    text("正在抽取帧...").size(16),
                    text("请稍候").size(12).style(|theme| {
                        let c_theme = get_theme(theme);
                        c_theme.muted_text_style()
                    }),
                ]
                .spacing(12)
                .align_x(iced::Alignment::Center),
            )
            .center_x(Length::Fill)
            .center_y(Length::Fill)
            .into();
        }

        if self.state.frames.is_empty() {
            return container(
                text("点击「开始抽帧」提取视频帧").size(14).style(|theme| {
                    let c_theme = get_theme(theme);
                    c_theme.secondary_text_style()
                }),
            )
            .center_x(Length::Fill)
            .center_y(Length::Fill)
            .into();
        }

        // Build thumbnail grid
        let thumbnail_size: f32 = 140.0;
        let cols = 4; // Fixed 4 columns

        let mut grid_rows: Vec<Element<'_, Message>> = Vec::new();
        let mut current_row: Vec<Element<'_, Message>> = Vec::new();

        for (i, frame) in self.state.frames.iter().enumerate() {
            let is_selected = self.state.selected_frame == Some(i);

            let thumbnail: Element<'_, Message> = container(
                column![
                    image(image::Handle::from_bytes(frame.image_data.clone()))
                        .width(Length::Fixed(thumbnail_size))
                        .height(Length::Fixed(thumbnail_size * 0.6)),
                    text(format!("#{} {:.2}s", i, frame.timestamp))
                        .size(10)
                        .width(Length::Fill)
                        .align_x(iced::alignment::Horizontal::Center),
                ]
                .spacing(2),
            )
            .padding(4)
            .width(Length::Fixed(thumbnail_size + 8.0))
            .style(move |theme| {
                let c_theme = get_theme(theme);
                if is_selected {
                    container::Style {
                        background: Some(c_theme.accent_color().into()),
                        border: iced::Border {
                            radius: 6.0.into(),
                            width: 2.0,
                            color: c_theme.accent_color(),
                        },
                        ..Default::default()
                    }
                } else {
                    c_theme.card_container_style()
                }
            })
            .into();

            let clickable: Element<'_, Message> = button(thumbnail)
                .on_press(Message::FrameSelected(i))
                .padding(0)
                .style(|_theme, _status| button::Style::default())
                .into();

            current_row.push(clickable);

            if current_row.len() >= cols {
                grid_rows.push(
                    row(std::mem::take(&mut current_row))
                        .spacing(8)
                        .into(),
                );
            }
        }

        if !current_row.is_empty() {
            grid_rows.push(
                row(current_row)
                    .spacing(8)
                    .into(),
            );
        }

        let grid = column(grid_rows)
            .spacing(8)
            .width(Length::Fill);

        // Selected frame preview
        let preview: Element<'_, Message> = if let Some(idx) = self.state.selected_frame {
            if let Some(frame) = self.state.frames.get(idx) {
                container(
                    column![
                        text(format!(
                            "帧 #{} | 时间: {:.3}s | 文件: {}",
                            idx, frame.timestamp, frame.filename
                        ))
                        .size(12),
                        image(image::Handle::from_bytes(frame.image_data.clone()))
                            .width(Length::Fill)
                            .height(Length::Fill),
                    ]
                    .spacing(8),
                )
                .padding(8)
                .height(Length::Fixed(200.0))
                .style(|theme| {
                    let c_theme = get_theme(theme);
                    c_theme.card_container_style()
                })
                .into()
            } else {
                container(text("")).into()
            }
        } else {
            container(text("点击缩略图查看大图").size(12).style(|theme| {
                let c_theme = get_theme(theme);
                c_theme.muted_text_style()
            }))
            .padding(8)
            .height(Length::Fixed(200.0))
            .center_x(Length::Fill)
            .center_y(Length::Fill)
            .style(|theme| {
                let c_theme = get_theme(theme);
                c_theme.card_container_style()
            })
            .into()
        };

        container(
            column![
                text(format!("已抽取 {} 帧", self.state.frames.len())).size(14),
                iced::widget::Space::new().height(Length::Fixed(8.0)),
                scrollable(grid).height(Length::Fill),
                iced::widget::Space::new().height(Length::Fixed(8.0)),
                preview,
            ]
            .spacing(4),
        )
        .padding(12)
        .width(Length::Fill)
        .height(Length::Fill)
        .style(|theme| {
            let c_theme = get_theme(theme);
            container::Style {
                background: Some(c_theme.nav_bg().into()),
                border: iced::Border {
                    radius: 8.0.into(),
                    width: 1.0,
                    color: c_theme.border_color(),
                },
                ..Default::default()
            }
        })
        .into()
    }

    fn build_status_bar<'a>(&self) -> Element<'a, Message> {
        let video_info = self
            .state
            .video_info
            .as_ref()
            .map(|info| {
                format!(
                    "视频: {}×{} | {:.2}fps | {:.1}s | {} 帧",
                    info.width, info.height, info.fps, info.duration, info.total_frames
                )
            })
            .unwrap_or_else(|| "未加载视频".to_string());

        let frame_info = if !self.state.frames.is_empty() {
            format!(" | 已抽取 {} 帧", self.state.frames.len())
        } else {
            String::new()
        };

        let output_info = self
            .state
            .output_dir
            .as_ref()
            .map(|p| format!(" | 输出: {}", p.display()))
            .unwrap_or_default();

        container(
            text(format!("{}{}{}", video_info, frame_info, output_info))
                .size(11)
                .style(|theme| {
                    let c_theme = get_theme(theme);
                    c_theme.muted_text_style()
                }),
        )
        .padding([4, 12])
        .into()
    }
}
