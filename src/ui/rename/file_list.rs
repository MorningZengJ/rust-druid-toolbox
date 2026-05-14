use crate::model::file_info::FileInfo;
use crate::model::rename_state::ConflictInfo;
use crate::model::replace_info::ReplaceInfo;
use crate::themes::get_theme;
use crate::ui::rename::logic;
use crate::ui::rename::spacing;
use crate::ui::rename::virtual_list::{VirtualList, VirtualState};
use iced::widget::{button, column, container, mouse_area, row, text};
use iced::{Alignment, Element, Length};

#[derive(Debug, Clone)]
pub enum FileListMessage {
    FileSelected(FileInfo),
    FileDoubleClicked(FileInfo),
    VirtualScroll(f32),
    LoadMore,
}

pub fn view<'a>(
    filter_file_list: &'a [FileInfo],
    selected_file: &Option<FileInfo>,
    replace_infos: &[ReplaceInfo],
    conflicts: &[ConflictInfo],
    virtual_state: &'a VirtualState,
    display_limit: usize,
) -> Element<'a, FileListMessage> {
    let total = filter_file_list.len().min(display_limit);

    // Header
    let header = container(
        row![
            container(text("文件名").size(12).style(|theme| {
                let c_theme = get_theme(theme);
                text::Style {
                    color: Some(c_theme.secondary_text_color()),
                }
            }))
            .width(Length::FillPortion(3))
            .padding([spacing::SM as u16, spacing::MD as u16]),
            container(text("重命名为").size(12).style(|theme| {
                let c_theme = get_theme(theme);
                text::Style {
                    color: Some(c_theme.secondary_text_color()),
                }
            }))
            .width(Length::FillPortion(3))
            .padding([spacing::SM as u16, spacing::MD as u16]),
            container(text("类型").size(12).style(|theme| {
                let c_theme = get_theme(theme);
                text::Style {
                    color: Some(c_theme.secondary_text_color()),
                }
            }))
            .width(Length::FillPortion(1))
            .padding([spacing::SM as u16, spacing::MD as u16]),
        ]
        .width(Length::Fill),
    )
    .style(|theme| {
        let c_theme = get_theme(theme);
        container::Style {
            background: Some(c_theme.table_header_bg().into()),
            ..Default::default()
        }
    });

    // Compute visible range
    let viewport_height = 600.0; // approximate, will be refined by layout
    let (start, end) = virtual_state.visible_range(spacing::ROW_H, viewport_height, total);

    // Build visible rows
    let visible_files: Vec<Element<'a, FileListMessage>> = filter_file_list
        .iter()
        .take(display_limit)
        .enumerate()
        .skip(start)
        .take(end - start)
        .map(|(i, file)| {
            let is_selected = selected_file.as_ref().map(|s| s == file).unwrap_or(false);
            let is_conflict = conflicts.iter().any(|c| c.source_indices.contains(&i));
            let preview_name = logic::apply_replace_rules(&file.name, replace_infos);
            let name_changed = preview_name != file.name;
            let file_type = if file.is_dir { "📁" } else { "📄" };

            let name_col = container(text(&file.name).size(13).style(|theme| {
                let c_theme = get_theme(theme);
                text::Style {
                    color: Some(c_theme.main_text_color()),
                }
            }))
            .width(Length::FillPortion(3))
            .padding([spacing::XS as u16, spacing::MD as u16]);

            // Diff-highlighted preview column
            let preview_col: Element<'a, FileListMessage> = if name_changed {
                let diff = diff_segments(file.name.clone(), preview_name.clone());
                container(diff)
                    .width(Length::FillPortion(3))
                    .padding([spacing::XS as u16, spacing::MD as u16])
                    .into()
            } else {
                container(
                    text(preview_name.clone())
                        .size(13)
                        .style(|theme| {
                            let c_theme = get_theme(theme);
                            text::Style {
                                color: Some(c_theme.muted_text_color()),
                            }
                        }),
                )
                .width(Length::FillPortion(3))
                .padding([spacing::XS as u16, spacing::MD as u16])
                .into()
            };

            let type_col = container(text(file_type).size(13))
                .width(Length::FillPortion(1))
                .padding([spacing::XS as u16, spacing::MD as u16]);

            let file_clone = file.clone();
            let file_clone2 = file.clone();
            let file_row = row![name_col, preview_col, type_col]
                .width(Length::Fill)
                .align_y(Alignment::Center);

            mouse_area(
                container(file_row)
                    .width(Length::Fill)
                    .height(Length::Fixed(spacing::ROW_H))
                    .style(move |theme| {
                        let c_theme = get_theme(theme);
                        let bg = if is_selected {
                            Some(c_theme.selected_row_bg())
                        } else if is_conflict {
                            Some(c_theme.conflict_bg())
                        } else {
                            None
                        };
                        container::Style {
                            background: bg.map(|c| c.into()),
                            ..Default::default()
                        }
                    }),
            )
            .on_press(FileListMessage::FileSelected(file_clone))
            .on_double_click(FileListMessage::FileDoubleClicked(file_clone2))
            .into()
        })
        .collect();

    // Use VirtualList for the scrollable content
    let virtual_list = VirtualList::new(
        virtual_state,
        total,
        spacing::ROW_H,
        visible_files,
        start,
    )
    .on_scroll(FileListMessage::VirtualScroll);

    let mut content = column![header].width(Length::Fill);
    content = content.push(virtual_list);

    // "Load more" button if needed
    if filter_file_list.len() > display_limit {
        let remaining = filter_file_list.len() - display_limit;
        content = content.push(
            container(
                button(
                    text(format!("加载更多 (剩余 {} 个文件)", remaining))
                        .size(12),
                )
                .on_press(FileListMessage::LoadMore)
                .padding([spacing::SM as u16, spacing::LG as u16]),
            )
            .center_x(Length::Fill)
            .padding(spacing::SM),
        );
    }

    content.into()
}

/// Compute diff segments between old and new filenames.
/// Returns a row of styled text fragments highlighting the changed portion.
fn diff_segments<'a, Message>(old: String, new: String) -> Element<'a, Message>
where
    Message: Clone + 'a,
{
    if old == new {
        return text(new).size(13).into();
    }

    // Find common prefix length (in chars)
    let common_prefix = old
        .chars()
        .zip(new.chars())
        .take_while(|(a, b)| a == b)
        .count();

    // Find common suffix length (in chars)
    let old_suffix_start = old.chars().count();
    let new_suffix_start = new.chars().count();
    let common_suffix = old
        .chars()
        .rev()
        .zip(new.chars().rev())
        .take_while(|(a, b)| a == b)
        .count()
        .min(old_suffix_start.saturating_sub(common_prefix))
        .min(new_suffix_start.saturating_sub(common_prefix));

    // Convert char indices to byte indices for slicing
    let prefix_end = new
        .char_indices()
        .nth(common_prefix)
        .map_or(new.len(), |(i, _)| i);

    let changed_end_char = new.chars().count() - common_suffix;
    let changed_end = new
        .char_indices()
        .nth(changed_end_char)
        .map_or(new.len(), |(i, _)| i);

    let prefix = &new[..prefix_end];
    let changed = &new[prefix_end..changed_end];
    let suffix = &new[changed_end..];

    let mut parts: Vec<Element<'a, Message>> = Vec::new();

    if !prefix.is_empty() {
        parts.push(text(prefix.to_string()).size(13).into());
    }
    if !changed.is_empty() {
        parts.push(
            container(
                text(changed.to_string())
                    .size(13)
                    .style(|theme| {
                        let c_theme = get_theme(theme);
                        text::Style {
                            color: Some(c_theme.diff_added_text_color()),
                        }
                    }),
            )
            .style(|theme| {
                let c_theme = get_theme(theme);
                container::Style {
                    background: Some(c_theme.diff_added_bg().into()),
                    border: iced::Border {
                        radius: 2.0.into(),
                        ..Default::default()
                    },
                    ..Default::default()
                }
            })
            .padding([1, 3])
            .into(),
        );
    }
    if !suffix.is_empty() {
        parts.push(text(suffix.to_string()).size(13).into());
    }

    row(parts)
        .spacing(0)
        .align_y(Alignment::Center)
        .into()
}
